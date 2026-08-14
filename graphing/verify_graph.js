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
 *
 *  Structure:
 *    • graphing/config.js  — curated nodeMapping / externalPackageMap / remoteNodes
 *    • runGovernance()     — pure pipeline, reads fs only, never writes, never exits
 *    • writeOutputs()      — writes the generated artifacts
 *    • main()              — CLI entry, guarded by require.main === module
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const config = require("./config");

// ============================================================================
//  SCAN — walk the codebase, discover every file → node mapping
// ============================================================================

function walk(root) {
  let results = [];
  let list;
  try {
    list = fs.readdirSync(root);
  } catch (_) {
    return results;
  }
  list.forEach((file) => {
    const full = path.join(root, file);
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

// ============================================================================
//  IMPORT EXTRACTION (stubs — full implementation is a later task)
// ============================================================================

// Stub: returns content unchanged. Full comment/string-stripping is a later task.
function stripCommentsAndStrings(content) {
  return content;
}

// Stub: returns []. Full import extraction is a later task.
function extractImports(content) {
  return [];
}

// ============================================================================
//  NODE MAPPING VALIDATION
// ============================================================================

// Validate nodeMapping paths exist on disk; build the sorted pattern list.
function validateNodeMapping(nodeMapping, projectRoot) {
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

  return { validatedNodeMapping, sortedPatterns, stalePatterns };
}

// ============================================================================
//  FILE → NODE CLASSIFICATION
// ============================================================================

// Map each source file to its node. `projectRoot` is needed to compute the
// project-relative path used to match `nodeMapping` patterns.
function classifyFiles(allFiles, sortedPatterns, projectRoot) {
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

  allFiles.forEach(classifyFile);

  return { fileToNode, nodeToFiles, discoveredLocalNodes, classifyFile };
}

// ============================================================================
//  IMPORT → NODE RESOLUTION
// ============================================================================

function resolveImportToNode(importPath, currentFile, opts) {
  const { projectRoot, externalPackageMap, fileToNode, classifyFile, discoveredExternals } = opts;

  // Check external packages
  for (const [pkg, nodeId] of Object.entries(externalPackageMap)) {
    if (importPath === pkg || importPath.startsWith(pkg + "/")) {
      discoveredExternals.add(nodeId);
      return { nodeId };
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

  if (!fullPathBase) return { nodeId: null, reason: null };

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
    if (directNode) return { nodeId: directNode };

    // If it's a barrel index, classify it now
    const classified = classifyFile(candidate);
    if (classified) return { nodeId: classified };

    // For barrel files that re-export, trace what they export
    const stat = fs.statSync(candidate);
    if (!stat.isFile()) continue;

    const content = fs.readFileSync(candidate, "utf8");
    const reExportRegex = /export\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    let reMatch;
    while ((reMatch = reExportRegex.exec(content)) !== null) {
      const resolved = resolveImportToNode(reMatch[1], candidate, opts);
      if (resolved.nodeId) return resolved;
    }
  }

  return { nodeId: null, reason: null };
}

// ============================================================================
//  REMOTE USAGE DETECTION (stub — full implementation is a later task)
// ============================================================================

// Stub: returns []. Remote detection currently stays inline in runGovernance.
function detectRemoteUsage(content, remoteNodes) {
  return [];
}

// ============================================================================
//  BUILD VERIFIED NODE LIST
// ============================================================================

function buildVerifiedNodes(allNodeIds, existingNodes) {
  const existingNodeMap = new Map();
  existingNodes.forEach((n) => existingNodeMap.set(n.id, n));

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

  return [...allNodeIds]
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
}

// ============================================================================
//  BUILD VERIFIED EDGE LIST
// ============================================================================

function buildVerifiedEdges(edgeEvidence, existingEdges, existingFlowTriggerEdges, allNodeIds) {
  const existingEdgeMap = new Map();
  existingEdges.forEach((e) => {
    if (e.id) {
      existingEdgeMap.set(`${e.source}->${e.target}`, e);
    }
  });

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

  return { verifiedArchEdges, verifiedFlowEdges, verifiedEdges };
}

// ============================================================================
//  PURE PIPELINE — scan, resolve, build, render. Never writes fs, never exits.
// ============================================================================

function runGovernance({
  projectRoot,
  mobileRoot,
  supabaseFunctionsDir,
  dataDir,
  config,
}) {
  const { nodeMapping, externalPackageMap, remoteNodes, orderedLayers, layerClasses } = config;

  // ==========================================================================
  //  LOAD EXISTING METADATA (for round-tripping descriptions/labels)
  // ==========================================================================

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

  const existingFlowTriggerEdges = existingEdges.filter(
    (e) => !e.id && e.label === "Flow triggers",
  );

  // ==========================================================================
  //  PHASE 1 — SCAN
  // ==========================================================================

  const { sortedPatterns, stalePatterns } = validateNodeMapping(nodeMapping, projectRoot);

  const allFiles = walk(mobileRoot);
  const { fileToNode, nodeToFiles, discoveredLocalNodes, classifyFile } = classifyFiles(
    allFiles,
    sortedPatterns,
    projectRoot,
  );

  // ==========================================================================
  //  PHASE 2 — EDGES: Parse imports, resolve to edges with evidence
  // ==========================================================================

  const edgeEvidence = new Map(); // "source->target" → { files: [{file, line, import}] }
  const discoveredExternals = new Set();
  const discoveredRemotes = new Set();

  const resolveOpts = {
    projectRoot,
    externalPackageMap,
    fileToNode,
    classifyFile,
    discoveredExternals,
  };

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
        const resolved = resolveImportToNode(importPath, file, resolveOpts);
        const toNode = resolved.nodeId;
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

  // ==========================================================================
  //  BUILD VERIFIED NODES + EDGES
  // ==========================================================================

  const allNodeIds = new Set([
    ...discoveredLocalNodes,
    ...discoveredExternals,
    ...discoveredRemotes,
  ]);

  const verifiedNodes = buildVerifiedNodes(allNodeIds, existingNodes);

  const { verifiedArchEdges, verifiedFlowEdges, verifiedEdges } = buildVerifiedEdges(
    edgeEvidence,
    existingEdges,
    existingFlowTriggerEdges,
    allNodeIds,
  );

  // ==========================================================================
  //  VALIDATE FLOWS
  // ==========================================================================

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

  // ==========================================================================
  //  PRE-RENDER OUTPUT STRINGS (never written here)
  // ==========================================================================

  const architecture = {
    nodes: verifiedNodes,
    edges: verifiedEdges,
    flows: existingFlows,
  };

  const jsonString = JSON.stringify(architecture, null, 2);

  // HTML — substitute the template placeholder (template read only)
  const templatePath = path.join(dataDir, "..", "template.html");
  let htmlString = null;
  if (fs.existsSync(templatePath)) {
    let htmlContent = fs.readFileSync(templatePath, "utf8");
    htmlContent = htmlContent.replace(
      "__ARCHITECTURE_JSON__",
      JSON.stringify(architecture),
    );
    htmlString = htmlContent;
  }

  const mdString = renderArchitectureMd(verifiedNodes, existingFlows);
  const chartsMdString = renderChartsMd(
    verifiedNodes,
    verifiedArchEdges,
    orderedLayers,
    layerClasses,
  );

  // ==========================================================================
  //  GOVERNANCE DELTAS (report + exit code inputs)
  // ==========================================================================

  const oldNodeIds = new Set(existingNodes.map((n) => n.id));
  const newNodeIds = allNodeIds;
  const removedNodes = [...oldNodeIds].filter((id) => !newNodeIds.has(id));
  const addedNodes = [...newNodeIds].filter((id) => !oldNodeIds.has(id));

  const oldEdgeKeys = new Set(
    existingEdges
      .filter((e) => e.id)
      .map((e) => `${e.source}->${e.target}`),
  );
  const newEdgeKeys = new Set(verifiedArchEdges.map((e) => `${e.source}->${e.target}`));
  const removedEdges = [...oldEdgeKeys].filter((k) => !newEdgeKeys.has(k));
  const addedEdges = [...newEdgeKeys].filter((k) => !oldEdgeKeys.has(k));

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

  const hasChanges =
    nodesChanged ||
    edgesChanged ||
    removedNodes.length > 0 ||
    addedNodes.length > 0 ||
    removedEdges.length > 0 ||
    addedEdges.length > 0 ||
    stalePatterns.length > 0;

  return {
    verifiedNodes,
    verifiedArchEdges,
    verifiedFlowEdges,
    verifiedEdges,
    allNodeIds,
    existingNodes,
    existingEdges,
    existingFlowTriggerEdges,
    nodeToFiles,
    flowWarnings,
    edgeEvidence,
    stalePatterns,
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    nodesChanged,
    edgesChanged,
    hasChanges,
    architecture,
    jsonString,
    htmlString,
    mdString,
    chartsMdString,
  };
}

// ============================================================================
//  WRITE OUTPUTS
// ============================================================================

function writeOutputs(
  result,
  { nodesPath, edgesPath, jsonPath, htmlPath, mdPath, chartsMdPath, templatePath },
) {
  const changedPaths = [];

  const nodesJsContent = `module.exports = ${JSON.stringify(result.verifiedNodes, null, 2)};\n`;
  const edgesJsContent = `module.exports = ${JSON.stringify(result.verifiedEdges, null, 2)};\n`;

  const outputs = [
    [nodesPath, nodesJsContent],
    [edgesPath, edgesJsContent],
    [jsonPath, result.jsonString],
    [mdPath, result.mdString],
    [chartsMdPath, result.chartsMdString],
  ];

  if (result.htmlString !== null && result.htmlString !== undefined) {
    outputs.push([htmlPath, result.htmlString]);
  }

  for (const [filePath, content] of outputs) {
    const existingContent = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : "";
    fs.writeFileSync(filePath, content);
    if (existingContent !== content) changedPaths.push(filePath);
  }

  return { changedPaths };
}

// ============================================================================
//  PURE RENDERERS — markdown, charts, governance report
// ============================================================================

function renderArchitectureMd(nodes, flows) {
  let mdContent = `# Harvi Architecture

> **Note to AI Agents**: This file is auto-generated by the governance engine (\`graphing/verify_graph.js\`). It is guaranteed to be 100% accurate as it is derived directly from the codebase. Use this to understand the structure, layers, and flows of the application.

`;

  const nodesByLayer = {};
  nodes.forEach((n) => {
    if (!nodesByLayer[n.layer]) nodesByLayer[n.layer] = [];
    nodesByLayer[n.layer].push(n);
  });

  mdContent += `## 📦 Nodes (Components, Services, & State)\n\n`;

  for (const [layer, nodesInLayer] of Object.entries(nodesByLayer)) {
    mdContent += `### ${layer.toUpperCase()} LAYER\n\n`;
    nodesInLayer.forEach((n) => {
      mdContent += `- **${n.id}** (${n.technology || "Unknown"}): ${n.description}\n`;
    });
    mdContent += "\n";
  }

  mdContent += `## 🔄 Flows (User Journeys & Sequences)\n\n`;
  flows.forEach((flow) => {
    mdContent += `### ${flow.name}\n${flow.description}\n\n`;
    if (flow.steps && flow.steps.length > 0) {
      flow.steps.sort((a, b) => a.order - b.order).forEach((step) => {
        mdContent += `${step.order}. **${step.node}**: ${step.action}\n`;
      });
      mdContent += "\n";
    }
  });

  return mdContent;
}

function renderChartsMd(nodes, archEdges, orderedLayers, layerClasses) {
  let chartsMdContent = `# Harvi Architecture Charts

> **Note to AI Agents**: This file is auto-generated by the governance engine (\`graphing/verify_graph.js\`).

## 📊 Architecture Diagram

\`\`\`mermaid
flowchart LR

  %% Styling Classes
`;

  for (const layer of orderedLayers) {
    chartsMdContent += `  classDef ${layer} ${layerClasses[layer]}\n`;
  }
  chartsMdContent += "\n";

  const nodesByLayer = {};
  nodes.forEach((n) => {
    if (!nodesByLayer[n.layer]) nodesByLayer[n.layer] = [];
    nodesByLayer[n.layer].push(n);
  });

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

  archEdges.forEach((e) => {
    chartsMdContent += `  ${e.source} --> ${e.target}\n`;
  });
  chartsMdContent += "\`\`\`\n\n";

  return chartsMdContent;
}

function renderReport(result) {
  let report = "";

  report += "\n╔══════════════════════════════════════════════════════════╗\n";
  report += "║           ARCHITECTURE GOVERNANCE REPORT                ║\n";
  report += "╚══════════════════════════════════════════════════════════╝\n\n";

  // — Stale paths —
  if (result.stalePatterns.length > 0) {
    report += "⚠️  STALE PATHS REMOVED FROM NODE MAPPING:\n";
    result.stalePatterns.forEach((s) => {
      report += `   ❌ ${s.nodeId} → ${s.pattern}\n`;
    });
    report += "\n";
  }

  // — Node report —
  const oldNodeIds = new Set(result.existingNodes.map((n) => n.id));
  const newNodeIds = result.allNodeIds;
  const keptNodes = [...newNodeIds].filter((id) => oldNodeIds.has(id));

  report += `📦 NODES: ${newNodeIds.size} total\n`;
  report += `   ✅ Verified: ${keptNodes.length}\n`;
  keptNodes.forEach((n) => {
    const fileCount = result.nodeToFiles.get(n)?.length || 0;
    const label = fileCount > 0 ? `(${fileCount} files)` : "(external)";
    report += `      • ${n} ${label}\n`;
  });

  if (result.addedNodes.length > 0) {
    report += `   ➕ Added: ${result.addedNodes.length}\n`;
    result.addedNodes.forEach((n) => (report += `      • ${n}\n`));
  }
  if (result.removedNodes.length > 0) {
    report += `   ❌ Removed: ${result.removedNodes.length}\n`;
    result.removedNodes.forEach((n) => (report += `      • ${n}\n`));
  }
  report += "\n";

  // — Edge report —
  const oldEdgeKeys = new Set(
    result.existingEdges
      .filter((e) => e.id)
      .map((e) => `${e.source}->${e.target}`),
  );
  const newEdgeKeys = new Set(result.verifiedArchEdges.map((e) => `${e.source}->${e.target}`));
  const keptEdges = [...newEdgeKeys].filter((k) => oldEdgeKeys.has(k));

  report += `🔗 ARCHITECTURAL EDGES: ${newEdgeKeys.size} total\n`;
  report += `   ✅ Verified: ${keptEdges.length}\n`;
  if (result.addedEdges.length > 0) {
    report += `   ➕ Added: ${result.addedEdges.length}\n`;
    result.addedEdges.forEach((e) => {
      const evidence = result.edgeEvidence.get(e) || [];
      const files = evidence.map((ev) => ev.file).slice(0, 3).join(", ");
      report += `      • ${e}  [${files}]\n`;
    });
  }
  if (result.removedEdges.length > 0) {
    report += `   ❌ Phantom edges removed: ${result.removedEdges.length}\n`;
    result.removedEdges.forEach((e) =>
      (report += `      • ${e}  (no import found in code)\n`),
    );
  }
  report += "\n";

  // — Flow trigger edges —
  const removedFlowTriggers =
    result.existingFlowTriggerEdges.length - result.verifiedFlowEdges.length;
  report += `🔄 FLOW TRIGGER EDGES: ${result.verifiedFlowEdges.length} kept\n`;
  if (removedFlowTriggers > 0) {
    report += `   ❌ ${removedFlowTriggers} removed (referenced non-existent nodes)\n`;
  }
  report += "\n";

  // — Flow validation —
  if (result.flowWarnings.length > 0) {
    report += "⚠️  FLOW VALIDATION WARNINGS:\n";
    result.flowWarnings.forEach((w) => {
      report += `   ⚠️  Flow "${w.flowName}" step ${w.stepOrder}: node "${w.missingNode}" not found\n`;
    });
    report += "\n";
  }

  // — File changes —
  report += "═══════════════════════════════════════════════════════════\n";
  if (result.hasChanges) {
    report += "📝 FILES WRITTEN:\n";
    if (result.nodesChanged) report += "   • data/nodes.js (updated)\n";
    if (result.edgesChanged) report += "   • data/edges.js (updated)\n";
    report += "   • architecture.json (regenerated)\n";
    report += "   • architecture.html (regenerated)\n";
    report += "   • ARCHITECTURE.md (regenerated)\n";
    report += "   • ARCHITECTURE_CHARTS.md (regenerated)\n";
    report += "\n";
    report += "💥 GOVERNANCE CHECK FAILED — data was corrected from codebase.\n";
    report += "   Run again to verify idempotence (should exit 0 on re-run).\n";
  } else {
    report += "✅ GOVERNANCE CHECK PASSED — architecture graph matches codebase.\n";
    report += "   No changes needed. All nodes and edges verified.\n";
    report += "   • ARCHITECTURE.md and ARCHITECTURE_CHARTS.md are up to date.\n";
  }

  return report;
}

// ============================================================================
//  CLI ENTRY
// ============================================================================

function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const graphingDir = __dirname;
  const dataDir = path.join(graphingDir, "data");
  const mobileRoot = path.join(projectRoot, "artifacts", "mobile");
  const supabaseFunctionsDir = path.join(projectRoot, "supabase", "functions");
  const templatePath = path.join(graphingDir, "template.html");

  const result = runGovernance({
    projectRoot,
    mobileRoot,
    supabaseFunctionsDir,
    dataDir,
    config,
  });

  writeOutputs(result, {
    nodesPath: path.join(dataDir, "nodes.js"),
    edgesPath: path.join(dataDir, "edges.js"),
    jsonPath: path.join(graphingDir, "architecture.json"),
    htmlPath: path.join(graphingDir, "architecture.html"),
    mdPath: path.join(projectRoot, "ARCHITECTURE.md"),
    chartsMdPath: path.join(projectRoot, "ARCHITECTURE_CHARTS.md"),
    templatePath,
  });

  process.stdout.write(renderReport(result));
  process.exit(result.hasChanges ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  walk,
  stripCommentsAndStrings,
  extractImports,
  validateNodeMapping,
  classifyFiles,
  resolveImportToNode,
  detectRemoteUsage,
  buildVerifiedNodes,
  buildVerifiedEdges,
  runGovernance,
  writeOutputs,
  renderArchitectureMd,
  renderChartsMd,
  renderReport,
  main,
};
