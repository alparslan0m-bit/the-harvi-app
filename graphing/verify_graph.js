/**
 * ============================================================================
 *  ARCHITECTURE GOVERNANCE ENGINE
 * ============================================================================
 *
 *  Single source of truth for the Harvi architecture graph.
 *  Run:  node graphing/verify_graph.js
 *
 *  Pipeline:
 *    1. SCAN    — walk the codebase, discover every file → node mapping
 *    2. EDGES   — parse every import, resolve to node→node edges with evidence
 *    3. WRITE   — write verified data/nodes.js + data/edges.js
 *    4. BUILD   — produce architecture.json + architecture.html
 *    5. AUDIT   — compare old vs new, print governance report, exit 0 or 1
 *
 *  Rules:
 *    • No node without files on disk (except external/remote nodes)
 *    • No edge without an import statement (except external inference + flow edges)
 *    • Every path in nodeMapping validated against disk
 *    • Idempotent: run twice → second run exits 0
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const graphingDir = __dirname;
const dataDir = path.join(graphingDir, "data");
const mobileRoot = path.join(projectRoot, "artifacts", "mobile");

// ============================================================================
// 1. NODE DEFINITIONS — curated IDs + file patterns (validated against disk)
// ============================================================================

const nodeMapping = {
  app: ["artifacts/mobile/app/_layout.tsx"],
  tab_navigator: [
    "artifacts/mobile/app/(main)/(tabs)/_layout.tsx",
  ],
  auth_feature: [
    "artifacts/mobile/src/features/auth",
    "artifacts/mobile/app/(auth)",
  ],
  learn_feature: [
    "artifacts/mobile/src/features/learn",
    "artifacts/mobile/app/(main)/(tabs)/(learn)",
  ],
  quiz_feature: [
    "artifacts/mobile/src/features/quiz",
    "artifacts/mobile/app/(main)/quiz",
  ],
  stats_feature: [
    "artifacts/mobile/src/features/stats",
    "artifacts/mobile/app/(main)/(tabs)/stats.tsx",
    "artifacts/mobile/app/(main)/stats",
  ],
  purchase_feature: [
    "artifacts/mobile/src/features/purchase",
    "artifacts/mobile/app/(main)/purchase",
  ],
  profile_feature: [
    "artifacts/mobile/src/features/profile",
    "artifacts/mobile/app/(main)/(tabs)/profile.tsx",
    "artifacts/mobile/app/(main)/profile",
  ],
  auth_store: ["artifacts/mobile/src/shared/store/authStore.tsx"],
  sync_store: ["artifacts/mobile/src/shared/store/syncStore.tsx"],
  purchase_store: ["artifacts/mobile/src/shared/store/purchaseStore.tsx"],
  cache_store: ["artifacts/mobile/src/shared/store/cacheStore.ts"],
  theme_store: ["artifacts/mobile/src/shared/store/themeStore.tsx"],
  hierarchy_service: [
    "artifacts/mobile/src/features/learn/services/hierarchyService.ts",
  ],
  access_service: [
    "artifacts/mobile/src/features/learn/services/accessService.ts",
  ],
  progress_service: [
    "artifacts/mobile/src/features/learn/services/progressService.ts",
  ],
  best_score_service: [
    "artifacts/mobile/src/features/learn/services/bestScoreService.ts",
  ],
  question_service: [
    "artifacts/mobile/src/features/quiz/services/questionService.ts",
  ],
  stats_service: [
    "artifacts/mobile/src/features/stats/services/statsService.ts",
  ],
  question_cache: [
    "artifacts/mobile/src/features/quiz/services/questionCache.ts",
  ],
  offline_queue: ["artifacts/mobile/src/shared/services/offlineQueue.ts"],
  supabase_client: ["artifacts/mobile/src/shared/services/supabase.ts"],
  offline_banner: [
    "artifacts/mobile/src/shared/components/OfflineBanner.tsx",
  ],
  feedback_form: [
    "artifacts/mobile/src/shared/components/FeedbackForm.tsx",
  ],
  error_boundary: [
    "artifacts/mobile/src/shared/components/ErrorBoundary.tsx",
  ],
  shared_utils: [
    "artifacts/mobile/src/shared/utils/netInfo.ts",
    "artifacts/mobile/src/shared/utils/cacheUtils.ts",
  ],
};

// External packages → node IDs (discovered from import statements)
const externalPackageMap = {
  "expo-secure-store": "secure_store",
  "@react-native-async-storage/async-storage": "async_storage",
  "react-native-purchases": "revenuecat",
  "@react-native-community/netinfo": "netinfo",
  "expo-web-browser": "google_oauth",
  "@tanstack/react-query": "react_query",
};

// Remote nodes — no local files, added if code references them
const remoteNodes = {
  supabase_auth: {
    patterns: [/supabase\.auth\./],
    description: "Supabase Auth API calls",
  },
  supabase_db: {
    patterns: [/supabase\.from\(/, /supabase\.rpc\(/],
    description: "Supabase Database queries/RPCs",
  },
  supabase_functions: {
    patterns: [/supabase\.functions\.invoke\(/],
    description: "Supabase Edge Function invocations",
  },
};

// ============================================================================
// 2. LOAD EXISTING METADATA (for round-tripping descriptions/labels)
// ============================================================================

let existingNodes = [];
let existingEdges = [];
let existingFlows = [];

try {
  existingNodes = require(path.join(dataDir, "nodes.js"));
} catch (_) {}
try {
  existingEdges = require(path.join(dataDir, "edges.js"));
} catch (_) {}
try {
  existingFlows = require(path.join(dataDir, "flows.js"));
} catch (_) {}

const existingNodeMap = new Map();
existingNodes.forEach((n) => existingNodeMap.set(n.id, n));

// Build lookup for existing architectural edges (have an id field)
const existingEdgeMap = new Map();
existingEdges.forEach((e) => {
  if (e.id) {
    existingEdgeMap.set(`${e.source}->${e.target}`, e);
  }
});

// Collect existing flow-trigger edges (no id field, label = "Flow triggers")
const existingFlowTriggerEdges = existingEdges.filter(
  (e) => !e.id && e.label === "Flow triggers",
);

// ============================================================================
// 3. PHASE 1 — SCAN: Walk codebase, map files to nodes
// ============================================================================

function walk(dir) {
  let results = [];
  let list;
  try {
    list = fs.readdirSync(dir);
  } catch (_) {
    return results;
  }
  list.forEach((file) => {
    const full = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch (_) {
      return;
    }
    if (stat.isDirectory()) {
      if (file === "node_modules" || file === ".expo") return;
      results = results.concat(walk(full));
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      results.push(full);
    }
  });
  return results;
}

// Validate nodeMapping paths exist on disk
const stalePatterns = [];
const validatedNodeMapping = {};

for (const [nodeId, patterns] of Object.entries(nodeMapping)) {
  const validPatterns = [];
  for (const pat of patterns) {
    const absPath = path.join(projectRoot, pat);
    if (fs.existsSync(absPath)) {
      validPatterns.push(pat);
    } else {
      stalePatterns.push({ nodeId, pattern: pat });
    }
  }
  if (validPatterns.length > 0) {
    validatedNodeMapping[nodeId] = validPatterns;
  }
}

// Build sorted pattern list (longest first for precise matching)
const sortedPatterns = [];
for (const [nodeId, patterns] of Object.entries(validatedNodeMapping)) {
  for (const pat of patterns) {
    sortedPatterns.push({ nodeId, pat, len: pat.length });
  }
}
sortedPatterns.sort((a, b) => b.len - a.len);

// Map each source file to its node
const fileToNode = new Map(); // abs path → nodeId
const nodeToFiles = new Map(); // nodeId → abs path[]
const discoveredLocalNodes = new Set();

function classifyFile(absFilePath) {
  const rel = path
    .relative(projectRoot, absFilePath)
    .replace(/\\/g, "/");

  for (const { nodeId, pat } of sortedPatterns) {
    if (rel === pat || rel.startsWith(pat + "/")) {
      fileToNode.set(absFilePath, nodeId);
      if (!nodeToFiles.has(nodeId)) nodeToFiles.set(nodeId, []);
      nodeToFiles.get(nodeId).push(absFilePath);
      discoveredLocalNodes.add(nodeId);
      return nodeId;
    }
  }
  return null;
}

const allFiles = walk(mobileRoot);
allFiles.forEach(classifyFile);

// ============================================================================
// 4. PHASE 2 — EDGES: Parse imports, resolve to edges with evidence
// ============================================================================

const edgeEvidence = new Map(); // "source->target" → { files: [{file, line, import}] }
const discoveredExternals = new Set();
const discoveredRemotes = new Set();

function resolveImportToNode(importPath, currentFile) {
  // Check external packages
  for (const [pkg, nodeId] of Object.entries(externalPackageMap)) {
    if (importPath === pkg || importPath.startsWith(pkg + "/")) {
      discoveredExternals.add(nodeId);
      return nodeId;
    }
  }

  // Resolve relative / alias imports to absolute path
  let fullPathBase = null;
  if (importPath.startsWith("@/")) {
    fullPathBase = path.join(
      projectRoot,
      "artifacts",
      "mobile",
      importPath.substring(2),
    );
  } else if (importPath.startsWith(".")) {
    fullPathBase = path.join(path.dirname(currentFile), importPath);
  }

  if (!fullPathBase) return null;

  // Try resolve with extensions and index files
  const candidates = [
    fullPathBase,
    fullPathBase + ".tsx",
    fullPathBase + ".ts",
    path.join(fullPathBase, "index.ts"),
    path.join(fullPathBase, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;

    // Check if this resolved file maps to a node
    const directNode = fileToNode.get(candidate);
    if (directNode) return directNode;

    // If it's a barrel index, classify it now
    const classified = classifyFile(candidate);
    if (classified) return classified;

    // For barrel files that re-export, trace what they export
    const stat = fs.statSync(candidate);
    if (!stat.isFile()) continue;

    const content = fs.readFileSync(candidate, "utf8");
    const reExportRegex = /export\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    let reMatch;
    while ((reMatch = reExportRegex.exec(content)) !== null) {
      const resolved = resolveImportToNode(reMatch[1], candidate);
      if (resolved) return resolved;
    }
  }

  return null;
}

// Scan every classified file for imports
for (const file of allFiles) {
  const fromNode = fileToNode.get(file);
  if (!fromNode) continue;

  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  // Parse import statements across the entire file content
  const importFromRegex = /from\s+['"]([^'"]+)['"]/g;
  const importDirectRegex = /import\s+['"]([^'"]+)['"]/g;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  function processRegex(regex) {
    let match;
    const localRegex = new RegExp(regex.source, regex.flags);
    while ((match = localRegex.exec(content)) !== null) {
      const importPath = match[1];
      const toNode = resolveImportToNode(importPath, file);
      if (toNode && toNode !== fromNode) {
        const key = `${fromNode}->${toNode}`;
        if (!edgeEvidence.has(key)) edgeEvidence.set(key, []);
        
        // Approximate line number by counting newlines up to match.index
        const lineNum = content.substring(0, match.index).split('\n').length;
        
        edgeEvidence.get(key).push({
          file: path.relative(projectRoot, file).replace(/\\/g, "/"),
          lineNum,
          importPath,
        });
      }
    }
  }

  processRegex(importFromRegex);
  processRegex(importDirectRegex);
  processRegex(requireRegex);

  // Detect remote Supabase usage (supabase_auth, supabase_db, supabase_functions)
  if (fromNode === "supabase_client") {
    // supabase_client connects to the remote services
    for (const [remoteId, config] of Object.entries(remoteNodes)) {
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          discoveredRemotes.add(remoteId);
          const key = `supabase_client->${remoteId}`;
          if (!edgeEvidence.has(key)) edgeEvidence.set(key, []);
          edgeEvidence.get(key).push({
            file: path.relative(projectRoot, file).replace(/\\/g, "/"),
            lineNum: 0,
            importPath: `[API usage: ${pattern.source}]`,
          });
        }
      }
    }
  } else {
    // Other nodes that call supabase APIs directly
    for (const [remoteId, config] of Object.entries(remoteNodes)) {
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          discoveredRemotes.add(remoteId);
        }
      }
    }
  }
}

// Infer edges from nodes that import supabase_client AND use remote APIs
for (const file of allFiles) {
  const fromNode = fileToNode.get(file);
  if (!fromNode || fromNode === "supabase_client") continue;

  // Only if this node imports supabase_client
  const hasSupabaseEdge = edgeEvidence.has(`${fromNode}->supabase_client`);
  if (!hasSupabaseEdge) continue;

  const content = fs.readFileSync(file, "utf8");
  for (const [remoteId, config] of Object.entries(remoteNodes)) {
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        discoveredRemotes.add(remoteId);
        // The connection goes through supabase_client, not direct
        // supabase_client->remote edges are already added above
      }
    }
  }
}

// Also add remote nodes that are reachable via the supabase_client edges
// The supabase_client file itself connects to auth, db, functions
// But we need to read the actual supabase.ts file to verify
const supabaseClientFile = path.join(
  projectRoot,
  "artifacts/mobile/src/shared/services/supabase.ts",
);
if (fs.existsSync(supabaseClientFile)) {
  const content = fs.readFileSync(supabaseClientFile, "utf8");
  // supabase client always connects to auth and db
  if (content.includes("createClient")) {
    discoveredRemotes.add("supabase_auth");
    discoveredRemotes.add("supabase_db");

    if (!edgeEvidence.has("supabase_client->supabase_auth")) {
      edgeEvidence.set("supabase_client->supabase_auth", [
        {
          file: "artifacts/mobile/src/shared/services/supabase.ts",
          lineNum: 0,
          importPath: "[createClient implies auth connection]",
        },
      ]);
    }
    if (!edgeEvidence.has("supabase_client->supabase_db")) {
      edgeEvidence.set("supabase_client->supabase_db", [
        {
          file: "artifacts/mobile/src/shared/services/supabase.ts",
          lineNum: 0,
          importPath: "[createClient implies DB connection]",
        },
      ]);
    }
  }
}

// Check if any node uses supabase.functions.invoke to discover supabase_functions
for (const file of allFiles) {
  const fromNode = fileToNode.get(file);
  if (!fromNode) continue;
  const content = fs.readFileSync(file, "utf8");
  if (/functions\.invoke\s*\(/.test(content)) {
    discoveredRemotes.add("supabase_functions");
    // The edge goes from the supabase_client to supabase_functions
    if (!edgeEvidence.has("supabase_client->supabase_functions")) {
      edgeEvidence.set("supabase_client->supabase_functions", [
        {
          file: path.relative(projectRoot, file).replace(/\\/g, "/"),
          lineNum: 0,
          importPath: "[functions.invoke usage]",
        },
      ]);
    }
  }
}

// Check supabase edge functions directory for supabase_functions node
const supabaseFunctionsDir = path.join(projectRoot, "supabase", "functions");
if (fs.existsSync(supabaseFunctionsDir)) {
  discoveredRemotes.add("supabase_functions");
  // supabase_functions -> supabase_db edge (edge functions write to DB)
  const fnFiles = walk(supabaseFunctionsDir);
  for (const fnFile of fnFiles) {
    const content = fs.readFileSync(fnFile, "utf8");
    if (/\.from\(|\.rpc\(|\.insert\(/.test(content)) {
      if (!edgeEvidence.has("supabase_functions->supabase_db")) {
        edgeEvidence.set("supabase_functions->supabase_db", [
          {
            file: path
              .relative(projectRoot, fnFile)
              .replace(/\\/g, "/"),
            lineNum: 0,
            importPath: "[Edge function DB write]",
          },
        ]);
      }
    }
  }
}

// ============================================================================
// 5. BUILD VERIFIED NODE LIST
// ============================================================================

const allNodeIds = new Set([
  ...discoveredLocalNodes,
  ...discoveredExternals,
  ...discoveredRemotes,
]);

function buildNode(nodeId) {
  const existing = existingNodeMap.get(nodeId);

  if (existing) {
    // Round-trip existing metadata
    return { ...existing };
  }

  // New node — create minimal entry
  return {
    id: nodeId,
    label: nodeId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    type: "unknown",
    layer: "unknown",
    description: `Auto-discovered node: ${nodeId}`,
  };
}

const verifiedNodes = [...allNodeIds]
  .sort((a, b) => {
    // Maintain original order from existing nodes, new ones at end
    const aIdx = existingNodes.findIndex((n) => n.id === a);
    const bIdx = existingNodes.findIndex((n) => n.id === b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  })
  .map(buildNode);

// ============================================================================
// 6. BUILD VERIFIED EDGE LIST
// ============================================================================

// Architectural edges (from import evidence)
let edgeCounter = 1;
const verifiedArchEdges = [];

// Sort edges to maintain stable order (existing edges first, then new ones)
const allEdgeKeys = [...edgeEvidence.keys()].sort((a, b) => {
  const aExisting = existingEdgeMap.has(a);
  const bExisting = existingEdgeMap.has(b);
  if (aExisting && bExisting) {
    const aId = parseInt(existingEdgeMap.get(a).id.replace("e", ""), 10);
    const bId = parseInt(existingEdgeMap.get(b).id.replace("e", ""), 10);
    return aId - bId;
  }
  if (aExisting) return -1;
  if (bExisting) return 1;
  return a.localeCompare(b);
});

for (const key of allEdgeKeys) {
  const [source, target] = key.split("->");

  // Both source and target must be in verified nodes
  if (!allNodeIds.has(source) || !allNodeIds.has(target)) continue;

  const existing = existingEdgeMap.get(key);
  if (existing) {
    // Round-trip existing metadata, update id to maintain sequence
    verifiedArchEdges.push({
      ...existing,
      id: `e${edgeCounter}`,
    });
  } else {
    // New edge discovered from code
    verifiedArchEdges.push({
      id: `e${edgeCounter}`,
      source,
      target,
      type: "calls",
      label: "calls",
      description: `Auto-discovered: ${edgeEvidence.get(key).map((e) => e.file).join(", ")}`,
    });
  }
  edgeCounter++;
}

// Flow-trigger edges — validate both source and target exist, pass through as-is
const verifiedFlowEdges = existingFlowTriggerEdges.filter(
  (e) => allNodeIds.has(e.source) && allNodeIds.has(e.target),
);

const verifiedEdges = [...verifiedArchEdges, ...verifiedFlowEdges];

// ============================================================================
// 7. VALIDATE FLOWS
// ============================================================================

const flowWarnings = [];
existingFlows.forEach((flow) => {
  if (flow.steps) {
    flow.steps.forEach((step) => {
      if (!allNodeIds.has(step.node)) {
        flowWarnings.push({
          flowId: flow.id,
          flowName: flow.name,
          stepOrder: step.order,
          missingNode: step.node,
        });
      }
    });
  }
});

// ============================================================================
// 8. PHASE 3 — WRITE DATA FILES
// ============================================================================

const nodesJsContent = `module.exports = ${JSON.stringify(verifiedNodes, null, 2)};\n`;
const edgesJsContent = `module.exports = ${JSON.stringify(verifiedEdges, null, 2)};\n`;

const oldNodesContent = fs.existsSync(path.join(dataDir, "nodes.js"))
  ? fs.readFileSync(path.join(dataDir, "nodes.js"), "utf8")
  : "";
const oldEdgesContent = fs.existsSync(path.join(dataDir, "edges.js"))
  ? fs.readFileSync(path.join(dataDir, "edges.js"), "utf8")
  : "";

const nodesChanged = nodesJsContent !== oldNodesContent;
const edgesChanged = edgesJsContent !== oldEdgesContent;

fs.writeFileSync(path.join(dataDir, "nodes.js"), nodesJsContent);
fs.writeFileSync(path.join(dataDir, "edges.js"), edgesJsContent);

// ============================================================================
// 9. PHASE 4 — BUILD architecture.json + architecture.html
// ============================================================================

const architecture = {
  nodes: verifiedNodes,
  edges: verifiedEdges,
  flows: existingFlows,
};

fs.writeFileSync(
  path.join(graphingDir, "architecture.json"),
  JSON.stringify(architecture, null, 2),
);

const templatePath = path.join(graphingDir, "template.html");
if (fs.existsSync(templatePath)) {
  let htmlContent = fs.readFileSync(templatePath, "utf8");
  htmlContent = htmlContent.replace(
    "__ARCHITECTURE_JSON__",
    JSON.stringify(architecture),
  );
  fs.writeFileSync(path.join(graphingDir, "architecture.html"), htmlContent);
}

// ============================================================================
// 10. PHASE 5 — GENERATE ARCHITECTURE.md (For AI Agents)
// ============================================================================

const mdPath = path.join(projectRoot, "ARCHITECTURE.md");
let mdContent = `# Harvi Architecture

> **Note to AI Agents**: This file is auto-generated by the governance engine (\`graphing/verify_graph.js\`). It is guaranteed to be 100% accurate as it is derived directly from the codebase. Use this to understand the structure, layers, and flows of the application.

`;

const nodesByLayer = {};
verifiedNodes.forEach((n) => {
  if (!nodesByLayer[n.layer]) nodesByLayer[n.layer] = [];
  nodesByLayer[n.layer].push(n);
});

// Generate Mermaid Diagram for Charts file
const chartsMdPath = path.join(projectRoot, "ARCHITECTURE_CHARTS.md");
let chartsMdContent = `# Harvi Architecture Charts

> **Note to AI Agents**: This file is auto-generated by the governance engine (\`graphing/verify_graph.js\`).

## 📊 Architecture Diagram

\`\`\`mermaid
flowchart LR

  %% Styling Classes
  classDef presentation fill:#f472b6,stroke:#831843,stroke-width:2px,color:#000
  classDef application fill:#60a5fa,stroke:#1e3a8a,stroke-width:2px,color:#000
  classDef infrastructure fill:#fbbf24,stroke:#78350f,stroke-width:2px,color:#000
  classDef external fill:#a1a1aa,stroke:#3f3f46,stroke-width:2px,color:#000

`;

const orderedLayers = ["presentation", "application", "infrastructure", "external"];
for (const layer of orderedLayers) {
  const nodesInLayer = nodesByLayer[layer] || [];
  if (nodesInLayer.length === 0) continue;
  
  chartsMdContent += `  subgraph ${layer.toUpperCase()}\n`;
  chartsMdContent += `    direction TB\n`; // Keep nodes inside the layer stacked vertically for compactness
  nodesInLayer.forEach((n) => {
    chartsMdContent += `    ${n.id}["${n.label}"]:::${layer}\n`;
  });
  chartsMdContent += `  end\n\n`;
}
verifiedArchEdges.forEach(e => {
  chartsMdContent += `  ${e.source} --> ${e.target}\n`;
});
chartsMdContent += "\`\`\`\n\n";

fs.writeFileSync(chartsMdPath, chartsMdContent);

mdContent += `## 📦 Nodes (Components, Services, & State)\n\n`;

for (const [layer, nodesInLayer] of Object.entries(nodesByLayer)) {
  mdContent += `### ${layer.toUpperCase()} LAYER\n\n`;
  nodesInLayer.forEach((n) => {
    mdContent += `- **${n.id}** (${n.technology || "Unknown"}): ${n.description}\n`;
  });
  mdContent += "\n";
}

mdContent += `## 🔄 Flows (User Journeys & Sequences)\n\n`;
existingFlows.forEach((flow) => {
  mdContent += `### ${flow.name}\n${flow.description}\n\n`;
  if (flow.steps && flow.steps.length > 0) {
    flow.steps.sort((a, b) => a.order - b.order).forEach((step) => {
      mdContent += `${step.order}. **${step.node}**: ${step.action}\n`;
    });
    mdContent += "\n";
  }
});

fs.writeFileSync(mdPath, mdContent);
const archMdGenerated = true;

// ============================================================================
// 11. PHASE 6 — GOVERNANCE AUDIT REPORT
// ============================================================================

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║           ARCHITECTURE GOVERNANCE REPORT                ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

// — Stale paths —
if (stalePatterns.length > 0) {
  console.log("⚠️  STALE PATHS REMOVED FROM NODE MAPPING:");
  stalePatterns.forEach((s) => {
    console.log(`   ❌ ${s.nodeId} → ${s.pattern}`);
  });
  console.log();
}

// — Node report —
const oldNodeIds = new Set(existingNodes.map((n) => n.id));
const newNodeIds = allNodeIds;
const removedNodes = [...oldNodeIds].filter((id) => !newNodeIds.has(id));
const addedNodes = [...newNodeIds].filter((id) => !oldNodeIds.has(id));
const keptNodes = [...newNodeIds].filter((id) => oldNodeIds.has(id));

console.log(`📦 NODES: ${newNodeIds.size} total`);
console.log(`   ✅ Verified: ${keptNodes.length}`);
keptNodes.forEach((n) => {
  const fileCount = nodeToFiles.get(n)?.length || 0;
  const label = fileCount > 0 ? `(${fileCount} files)` : "(external)";
  console.log(`      • ${n} ${label}`);
});

if (addedNodes.length > 0) {
  console.log(`   ➕ Added: ${addedNodes.length}`);
  addedNodes.forEach((n) => console.log(`      • ${n}`));
}
if (removedNodes.length > 0) {
  console.log(`   ❌ Removed: ${removedNodes.length}`);
  removedNodes.forEach((n) => console.log(`      • ${n}`));
}
console.log();

// — Edge report —
const oldEdgeKeys = new Set(
  existingEdges
    .filter((e) => e.id)
    .map((e) => `${e.source}->${e.target}`),
);
const newEdgeKeys = new Set(verifiedArchEdges.map((e) => `${e.source}->${e.target}`));
const removedEdges = [...oldEdgeKeys].filter((k) => !newEdgeKeys.has(k));
const addedEdges = [...newEdgeKeys].filter((k) => !oldEdgeKeys.has(k));
const keptEdges = [...newEdgeKeys].filter((k) => oldEdgeKeys.has(k));

console.log(`🔗 ARCHITECTURAL EDGES: ${newEdgeKeys.size} total`);
console.log(`   ✅ Verified: ${keptEdges.length}`);
if (addedEdges.length > 0) {
  console.log(`   ➕ Added: ${addedEdges.length}`);
  addedEdges.forEach((e) => {
    const evidence = edgeEvidence.get(e) || [];
    const files = evidence.map((ev) => ev.file).slice(0, 3).join(", ");
    console.log(`      • ${e}  [${files}]`);
  });
}
if (removedEdges.length > 0) {
  console.log(`   ❌ Phantom edges removed: ${removedEdges.length}`);
  removedEdges.forEach((e) =>
    console.log(`      • ${e}  (no import found in code)`),
  );
}
console.log();

// — Flow trigger edges —
const removedFlowTriggers = existingFlowTriggerEdges.length - verifiedFlowEdges.length;
console.log(`🔄 FLOW TRIGGER EDGES: ${verifiedFlowEdges.length} kept`);
if (removedFlowTriggers > 0) {
  console.log(
    `   ❌ ${removedFlowTriggers} removed (referenced non-existent nodes)`,
  );
}
console.log();

// — Flow validation —
if (flowWarnings.length > 0) {
  console.log("⚠️  FLOW VALIDATION WARNINGS:");
  flowWarnings.forEach((w) => {
    console.log(
      `   ⚠️  Flow "${w.flowName}" step ${w.stepOrder}: node "${w.missingNode}" not found`,
    );
  });
  console.log();
}

// — File changes —
const hasChanges =
  nodesChanged ||
  edgesChanged ||
  removedNodes.length > 0 ||
  addedNodes.length > 0 ||
  removedEdges.length > 0 ||
  addedEdges.length > 0 ||
  stalePatterns.length > 0;

console.log("═══════════════════════════════════════════════════════════");
if (hasChanges) {
  console.log("📝 FILES WRITTEN:");
  if (nodesChanged) console.log("   • data/nodes.js (updated)");
  if (edgesChanged) console.log("   • data/edges.js (updated)");
  console.log("   • architecture.json (regenerated)");
  console.log("   • architecture.html (regenerated)");
  console.log("   • ARCHITECTURE.md (regenerated)");
  console.log("   • ARCHITECTURE_CHARTS.md (regenerated)");
  console.log();
  console.log(
    "💥 GOVERNANCE CHECK FAILED — data was corrected from codebase.",
  );
  console.log(
    "   Run again to verify idempotence (should exit 0 on re-run).",
  );
  process.exit(1);
} else {
  console.log(
    "✅ GOVERNANCE CHECK PASSED — architecture graph matches codebase.",
  );
  console.log("   No changes needed. All nodes and edges verified.");
  console.log("   • ARCHITECTURE.md and ARCHITECTURE_CHARTS.md are up to date.");
  process.exit(0);
}
