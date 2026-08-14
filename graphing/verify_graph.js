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

// Blank out comments and non-module-specifier string literals while keeping the
// BYTE LENGTH identical to the input (newlines preserved), so match indices and
// line-number math on the original content stay valid. Module specifier strings
// (those immediately preceded by import/export/from/require(/import() in code)
// are preserved verbatim so the extraction regexes can capture them; everything
// else that is a comment or a plain string literal becomes spaces.
function stripCommentsAndStrings(content) {
  const length = content.length;
  const out = new Array(length).fill(" ");

  // Is the quote at `pos` a module-specifier string (preceded by the import
  // keyword family in code context)?
  function isSpecifierPos(pos) {
    const before = content.slice(0, pos).replace(/[ \t\r\n]+$/, "");
    const okBoundary = (kwLen) => {
      const idx = before.length - kwLen - 1;
      return idx < 0 || !/[A-Za-z0-9_$]/.test(before[idx]);
    };
    return (
      (before.endsWith("from") && okBoundary(4)) ||
      (before.endsWith("import") && okBoundary(6)) ||
      (before.endsWith("import(") && okBoundary(7)) ||
      (before.endsWith("require(") && okBoundary(8))
    );
  }

  // Consume a quoted string verbatim. Returns the index after the closing quote.
  function skipQuotedVerbatim(quote, start) {
    let j = start + 1;
    while (j < length) {
      const ch = content[j];
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === quote) return j + 1;
      j++;
    }
    return j;
  }

  // Scan a ${...} interpolation inside a template, starting at the "{". The
  // region is real code, so it is preserved verbatim (nested strings, comments,
  // backticks and ${} nesting are tracked). Returns index after the matching "}".
  function consumeInterpolation(openBrace) {
    out[openBrace] = "{";
    let j = openBrace + 1;
    let depth = 1;
    while (j < length) {
      const ch = content[j];
      if (ch === "\\") {
        out[j] = ch;
        if (j + 1 < length) out[j + 1] = content[j + 1];
        j += 2;
        continue;
      }
      if (ch === "'" || ch === '"') {
        const end = skipQuotedVerbatim(ch, j);
        for (let k = j; k < end; k++) out[k] = content[k];
        j = end;
        continue;
      }
      if (ch === "`") {
        j = consumeTemplate(j);
        continue;
      }
      if (ch === "/" && content[j + 1] === "/") {
        out[j] = "/";
        out[j + 1] = "/";
        j += 2;
        while (j < length && content[j] !== "\n") {
          out[j] = content[j];
          j++;
        }
        continue;
      }
      if (ch === "/" && content[j + 1] === "*") {
        out[j] = "/";
        out[j + 1] = "*";
        j += 2;
        while (j < length && !(content[j] === "*" && content[j + 1] === "/")) {
          out[j] = content[j];
          j++;
        }
        if (j < length) {
          out[j] = "*";
          out[j + 1] = "/";
          j += 2;
        }
        continue;
      }
      if (ch === "$" && content[j + 1] === "{") {
        out[j] = "$";
        out[j + 1] = "{";
        j += 2;
        depth++;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) {
          out[j] = "}";
          return j + 1;
        }
      }
      out[j] = ch;
      j++;
    }
    return j;
  }

  // Scan a backtick template starting at `start`. The template string text is
  // blanked (templates can never be module specifiers); ${...} interpolations
  // are real code and are preserved. Returns index after the closing backtick.
  function consumeTemplate(start) {
    out[start] = " ";
    let j = start + 1;
    while (j < length) {
      const ch = content[j];
      if (ch === "\\") {
        out[j] = " ";
        if (j + 1 < length) {
          const nxt = content[j + 1];
          out[j + 1] = nxt === "\n" ? "\n" : " ";
        }
        j += 2;
        continue;
      }
      if (ch === "`") {
        out[j] = " ";
        return j + 1;
      }
      if (ch === "$" && content[j + 1] === "{") {
        out[j] = "$";
        j = consumeInterpolation(j + 1);
        continue;
      }
      out[j] = ch === "\n" ? "\n" : " ";
      j++;
    }
    return j;
  }

  for (let i = 0; i < length; ) {
    const ch = content[i];

    if (ch === "/" && content[i + 1] === "/") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < length && content[i] !== "\n") {
        out[i] = " ";
        i++;
      }
      continue;
    }

    if (ch === "/" && content[i + 1] === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < length) {
        if (content[i] === "*" && content[i + 1] === "/") {
          out[i] = " ";
          out[i + 1] = " ";
          i += 2;
          break;
        }
        out[i] = content[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      if (isSpecifierPos(i)) {
        const end = skipQuotedVerbatim(ch, i);
        for (let k = i; k < end; k++) out[k] = content[k];
        i = end;
      } else {
        out[i] = " ";
        i++;
        while (i < length) {
          const c2 = content[i];
          if (c2 === "\\") {
            out[i] = " ";
            if (i + 1 < length) {
              const nxt = content[i + 1];
              out[i + 1] = nxt === "\n" ? "\n" : " ";
            }
            i += 2;
            continue;
          }
          if (c2 === ch) {
            out[i] = " ";
            i++;
            break;
          }
          out[i] = c2 === "\n" ? "\n" : " ";
          i++;
        }
      }
      continue;
    }

    if (ch === "`") {
      i = consumeTemplate(i);
      continue;
    }

    out[i] = ch;
    i++;
  }

  return out.join("");
}

// Extract import/export/require/dynamic-import module specifiers with their
// 1-based source line numbers. Runs over the stripped content (comments and
// plain strings have been blanked, so no phantom imports are picked up), and
// recreates each regex per call to avoid shared lastIndex state.
function extractImports(content) {
  const stripped = stripCommentsAndStrings(content);
  const regexes = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  const matches = [];
  for (const re of regexes) {
    let m;
    while ((m = re.exec(stripped)) !== null) {
      matches.push({
        index: m.index,
        importPath: m[1],
        lineNum: content.slice(0, m.index).split("\n").length,
      });
    }
  }
  matches.sort((a, b) => a.index - b.index);
  return matches.map(({ importPath, lineNum }) => ({ importPath, lineNum }));
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

  const isRelative = importPath.startsWith("./") || importPath.startsWith("../");
  const isAliased = importPath.startsWith("@/");
  if (!isRelative && !isAliased) {
    // Bare specifier that is not in externalPackageMap: its target is never a node.
    return { nodeId: null, reason: "external-unmapped", targetPath: importPath };
  }

  // Resolve relative / alias imports to absolute path
  let fullPathBase = null;
  if (isAliased) {
    fullPathBase = path.join(
      projectRoot,
      "artifacts",
      "mobile",
      importPath.substring(2),
    );
  } else {
    fullPathBase = path.join(path.dirname(currentFile), importPath);
  }

  // Try resolve with extensions and index files
  const candidates = [
    fullPathBase,
    fullPathBase + ".tsx",
    fullPathBase + ".ts",
    path.join(fullPathBase, "index.ts"),
    path.join(fullPathBase, "index.tsx"),
  ];
  let resolvedFile = null;

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

    resolvedFile = resolvedFile || candidate;

    const content = fs.readFileSync(candidate, "utf8");
    const reExportRegex = /export\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    let reMatch;
    while ((reMatch = reExportRegex.exec(content)) !== null) {
      const resolved = resolveImportToNode(reMatch[1], candidate, opts);
      if (resolved.nodeId) return resolved;
    }
  }

  if (resolvedFile) {
    // Resolved on disk to a file, but no nodeMapping pattern covers it.
    return { nodeId: null, reason: "resolved-unmapped", targetPath: path.resolve(resolvedFile) };
  }
  // No candidate exists on disk (no file, no index.*).
  return { nodeId: null, reason: "unresolvable", targetPath: path.resolve(fullPathBase) };
}

// ============================================================================
//  REMOTE USAGE DETECTION (stub — full implementation is a later task)
// ============================================================================

// For each remote, find the FIRST match of any of its patterns in the content
// and report real, 1-based line plus the trimmed text of the matched line.
function detectRemoteUsage(content, remoteNodes) {
  const usage = [];
  for (const [remoteId, remoteConfig] of Object.entries(remoteNodes)) {
    if (!remoteConfig || !Array.isArray(remoteConfig.patterns)) continue;
    let matchIndex = -1;
    for (const pattern of remoteConfig.patterns) {
      matchIndex = content.search(pattern);
      if (matchIndex !== -1) break;
    }
    if (matchIndex === -1) continue;
    const lineStart = content.lastIndexOf("\n", matchIndex) + 1;
    const lineEndIdx = content.indexOf("\n", matchIndex);
    const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;
    usage.push({
      remoteId,
      lineNum: content.slice(0, matchIndex).split("\n").length,
      snippet: content.slice(lineStart, lineEnd).trim(),
    });
  }
  return usage;
}

// ============================================================================
//  BUILD VERIFIED NODE LIST
// ============================================================================

function buildVerifiedNodes(allNodeIds, existingNodes, opts = {}) {
  const { sortedPatterns, projectRoot, externalPackageMap, remoteNodes } = opts;
  const existingNodeMap = new Map();
  existingNodes.forEach((n) => existingNodeMap.set(n.id, n));
  const staleMetadataPaths = [];

  const patternsByNode = new Map();
  if (sortedPatterns) {
    for (const { nodeId, pat } of sortedPatterns) {
      if (!patternsByNode.has(nodeId)) patternsByNode.set(nodeId, []);
      patternsByNode.get(nodeId).push(pat);
    }
  }

  const isExternalOrRemote = (id) =>
    (externalPackageMap && id in externalPackageMap) ||
    (remoteNodes && id in remoteNodes);

  function buildNode(nodeId) {
    const existing = existingNodeMap.get(nodeId);
    const nodePatterns = patternsByNode.get(nodeId) || [];
    let derivedPath = null;
    if (nodePatterns.length > 0) {
      derivedPath = [...nodePatterns].sort((a, b) => b.length - a.length)[0];
    }

    if (existing) {
      const node = { ...existing };
      if (existing.path && derivedPath && projectRoot && !isExternalOrRemote(nodeId)) {
        const absCurated = path.join(projectRoot, existing.path);
        if (existing.path !== derivedPath && !fs.existsSync(absCurated)) {
          staleMetadataPaths.push({
            nodeId,
            curatedPath: existing.path,
            derivedPath,
          });
          node.path = derivedPath;
        }
      }
      return node;
    }

    const newNode = {
      id: nodeId,
      label: nodeId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      type: "unknown",
      layer: "unknown",
      description: `Auto-discovered node: ${nodeId}`,
    };
    if (derivedPath && !isExternalOrRemote(nodeId)) {
      newNode.path = derivedPath;
    }
    return newNode;
  }

  const verifiedNodes = [...allNodeIds]
    .sort((a, b) => {
      const aIdx = existingNodes.findIndex((n) => n.id === a);
      const bIdx = existingNodes.findIndex((n) => n.id === b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(buildNode);

  return { verifiedNodes, staleMetadataPaths };
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
  const {
    nodeMapping,
    externalPackageMap,
    remoteNodes,
    supabaseClientImplicitRemotes,
    orderedLayers,
    layerClasses,
  } = config;

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
  const droppedImports = []; // { fromNode, targetPath, reason, files:[{file,lineNum,importPath}] }
  const droppedImportKey = new Map(); // fromNode|targetPath|reason → entry (dedup)

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

    // Parse import statements across the entire file content (comment/string
    // safe, includes dynamic import())
    for (const { importPath, lineNum } of extractImports(content)) {
      const resolved = resolveImportToNode(importPath, file, resolveOpts);
      const toNode = resolved.nodeId;
      if (toNode) {
        if (toNode !== fromNode) {
          const key = `${fromNode}->${toNode}`;
          if (!edgeEvidence.has(key)) edgeEvidence.set(key, []);
          edgeEvidence.get(key).push({
            file: path.relative(projectRoot, file).replace(/\\/g, "/"),
            lineNum,
            importPath,
          });
        }
      } else if (resolved.reason) {
        // Import resolved to nothing the graph covers — surface it instead of
        // dropping silently. Advisory only: never affects hasChanges.
        const dropKey = `${fromNode}|${resolved.targetPath}|${resolved.reason}`;
        let drop = droppedImportKey.get(dropKey);
        if (!drop) {
          drop = {
            fromNode,
            targetPath: resolved.targetPath,
            reason: resolved.reason,
            files: [],
          };
          droppedImportKey.set(dropKey, drop);
          droppedImports.push(drop);
        }
        // Cap evidence per entry to keep the report bounded.
        if (drop.files.length < 10) {
          drop.files.push({
            file: path.relative(projectRoot, file).replace(/\\/g, "/"),
            lineNum,
            importPath,
          });
        }
      }
    }

    // Detect remote Supabase usage — a file that directly invokes a remote API
    // edges fromNode -> remoteId with real, 1-based line evidence.
    for (const { remoteId, lineNum, snippet } of detectRemoteUsage(content, remoteNodes)) {
      discoveredRemotes.add(remoteId);
      const key = `${fromNode}->${remoteId}`;
      if (!edgeEvidence.has(key)) edgeEvidence.set(key, []);
      edgeEvidence.get(key).push({
        file: path.relative(projectRoot, file).replace(/\\/g, "/"),
        lineNum,
        snippet,
      });
    }

    // supabase_client additionally gets implicit edges to the configured remotes
    // (supabase_auth, supabase_db) when the client is constructed in this file.
    if (fromNode === "supabase_client") {
      const implicit = supabaseClientImplicitRemotes[fromNode] || [];
      const createMatch = content.search(/createClient(?:WithOptions)?\(/);
      if (implicit.length > 0 && createMatch !== -1) {
        const lineStart = content.lastIndexOf("\n", createMatch) + 1;
        const lineEndIdx = content.indexOf("\n", createMatch);
        const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;
        const evidence = {
          file: path.relative(projectRoot, file).replace(/\\/g, "/"),
          lineNum: content.slice(0, createMatch).split("\n").length,
          snippet: content.slice(lineStart, lineEnd).trim(),
        };
        for (const remoteId of implicit) {
          const key = `${fromNode}->${remoteId}`;
          if (edgeEvidence.has(key)) continue;
          discoveredRemotes.add(remoteId);
          edgeEvidence.set(key, [evidence]);
        }
      }
    }
  }

  // supabase_functions -> supabase_db — edge functions write to the database.
  // Config-driven via detectRemoteUsage on the supabase_db patterns, extended
  // with the legacy DB-access verbs (.from/.rpc/.insert) that defined this
  // edge, because edge functions bind their client to a non-default name
  // (supabaseAdmin) that the pure superbase.<verb> patterns cannot match.
  if (fs.existsSync(supabaseFunctionsDir)) {
    discoveredRemotes.add("supabase_functions");
    const fnPatterns = {
      supabase_db: {
        patterns: [
          ...remoteNodes.supabase_db.patterns,
          /\.from\(/,
          /\.rpc\(/,
          /\.insert\(/,
        ],
      },
    };
    const fnFiles = walk(supabaseFunctionsDir);
    for (const fnFile of fnFiles) {
      const content = fs.readFileSync(fnFile, "utf8");
      const usage = detectRemoteUsage(content, fnPatterns);
      if (usage.length === 0) continue;
      const key = "supabase_functions->supabase_db";
      if (!edgeEvidence.has(key)) edgeEvidence.set(key, []);
      edgeEvidence.get(key).push({
        file: path.relative(projectRoot, fnFile).replace(/\\/g, "/"),
        lineNum: usage[0].lineNum,
        snippet: usage[0].snippet,
      });
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

  const { verifiedNodes, staleMetadataPaths } = buildVerifiedNodes(
    allNodeIds,
    existingNodes,
    { sortedPatterns, projectRoot, externalPackageMap, remoteNodes },
  );

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

  const mdString = renderArchitectureMd(verifiedNodes, existingFlows, orderedLayers);
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
    stalePatterns.length > 0 ||
    flowWarnings.length > 0 ||
    (staleMetadataPaths && staleMetadataPaths.length > 0);

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
    droppedImports,
    stalePatterns,
    staleMetadataPaths,
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

// Total governance verdict: any node/edge/pattern delta, flow warning, stale
// metadata path, or on-disk artifact drift must fail the build (exit 1).
function computeExitCode(result, changedPaths) {
  return result.hasChanges || changedPaths.length > 0;
}

// ============================================================================
//  PURE RENDERERS — markdown, charts, governance report
// ============================================================================

// Shared layering order for both renderers (Findings 9-10): emit sections in
// `orderedLayers` order, then surplus layers (e.g. unknown) as a final bucket.
function orderNodes(nodes, orderedLayers) {
  const layers = orderedLayers || ["presentation", "application", "infrastructure", "external"];
  const nodesByLayer = {};
  nodes.forEach((n) => {
    const l = n.layer || "unknown";
    if (!nodesByLayer[l]) nodesByLayer[l] = [];
    nodesByLayer[l].push(n);
  });

  const sections = [];
  const renderedLayers = new Set();
  for (const layer of layers) {
    const nodesInLayer = nodesByLayer[layer] || [];
    if (nodesInLayer.length === 0) continue;
    renderedLayers.add(layer);
    sections.push({ layer, nodes: nodesInLayer });
  }

  const leftoverNodes = [];
  for (const [layer, nodesInLayer] of Object.entries(nodesByLayer)) {
    if (!renderedLayers.has(layer)) leftoverNodes.push(...nodesInLayer);
  }

  return { layers, nodesByLayer, sections, leftoverNodes };
}

function renderArchitectureMd(nodes, flows, orderedLayers) {
  let mdContent = `# Harvi Architecture

> **Note to AI Agents**: This file is auto-generated by the governance engine (\`graphing/verify_graph.js\`). It is guaranteed to be 100% accurate as it is derived directly from the codebase. Use this to understand the structure, layers, and flows of the application.

`;

  const { sections, leftoverNodes } = orderNodes(nodes, orderedLayers);

  mdContent += `## 📦 Nodes (Components, Services, & State)\n\n`;

  sections.forEach(({ layer, nodes: nodesInLayer }) => {
    mdContent += `### ${layer.toUpperCase()} LAYER\n\n`;
    nodesInLayer.forEach((n) => {
      mdContent += `- **${n.id}** (${n.technology || "Unknown"}): ${n.description}\n`;
    });
    mdContent += "\n";
  });

  if (leftoverNodes.length > 0) {
    mdContent += `### OTHER LAYER\n\n`;
    leftoverNodes.forEach((n) => {
      mdContent += `- **${n.id}** (${n.technology || "Unknown"}): ${n.description}\n`;
    });
    mdContent += "\n";
  }

  mdContent += `## 🔄 Flows (User Journeys & Sequences)\n\n`;
  flows.forEach((flow) => {
    mdContent += `### ${flow.name}\n${flow.description}\n\n`;
    if (flow.steps && flow.steps.length > 0) {
      [...flow.steps].sort((a, b) => a.order - b.order).forEach((step) => {
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

  const layers = orderedLayers || ["presentation", "application", "infrastructure", "external"];
  const classes = layerClasses || {};

  for (const layer of layers) {
    if (classes[layer]) {
      chartsMdContent += `  classDef ${layer} ${classes[layer]}\n`;
    }
  }

  const { sections, leftoverNodes } = orderNodes(nodes, orderedLayers);

  sections.forEach(({ layer, nodes: nodesInLayer }) => {
    chartsMdContent += `  subgraph ${layer.toUpperCase()}\n`;
    chartsMdContent += `    direction TB\n`;
    nodesInLayer.forEach((n) => {
      chartsMdContent += `    ${n.id}["${n.label}"]:::${layer}\n`;
    });
    chartsMdContent += `  end\n\n`;
  });

  if (leftoverNodes.length > 0) {
    const unknownClass = classes.unknown || "fill:#666,stroke:#999,stroke-width:1px,stroke-dasharray: 5 5";
    chartsMdContent += `  classDef unknown ${unknownClass}\n\n`;
    chartsMdContent += `  subgraph MISC\n`;
    chartsMdContent += `    direction TB\n`;
    leftoverNodes.forEach((n) => {
      chartsMdContent += `    ${n.id}["${n.label}"]:::unknown\n`;
    });
    chartsMdContent += `  end\n\n`;
  }

  archEdges.forEach((e) => {
    chartsMdContent += `  ${e.source} --> ${e.target}\n`;
  });
  chartsMdContent += "```\n\n";

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

  if (result.staleMetadataPaths && result.staleMetadataPaths.length > 0) {
    report += "⚠️  STALE NODE METADATA PATHS CORRECTED:\n";
    result.staleMetadataPaths.forEach((s) => {
      report += `   ❌ ${s.nodeId}: "${s.curatedPath}" -> "${s.derivedPath}"\n`;
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

  // — Unmapped imports (advisory, never part of hasChanges) —
  const droppedImports = result.droppedImports || [];
  if (droppedImports.length > 0) {
    const verbose = result.verbose === true;
    report += `⚠️ UNMAPPED IMPORTS: ${droppedImports.length} (advisory)\n`;
    const samples = verbose ? droppedImports : droppedImports.slice(0, 5);
    samples.forEach((d) => {
      report += `   • ${d.fromNode} -> ${d.targetPath} [${d.reason}]\n`;
    });
    if (!verbose && droppedImports.length > 5) {
      report += `   ... and ${droppedImports.length - 5} more (run with --verbose to list all)\n`;
    }
    report += "\n";
  }

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
    if (result.flowWarnings.length > 0) {
      report += "💥 GOVERNANCE CHECK FAILED — flows.js references missing nodes.\n";
      report += "   flows.js is curated: fix the node references by hand; a re-run will not clear this.\n";
    } else {
      report += "💥 GOVERNANCE CHECK FAILED — data was corrected from codebase.\n";
      report += "   Run again to verify idempotence (should exit 0 on re-run).\n";
    }
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
  result.verbose = process.argv.includes("--verbose");

  const { changedPaths } = writeOutputs(result, {
    nodesPath: path.join(dataDir, "nodes.js"),
    edgesPath: path.join(dataDir, "edges.js"),
    jsonPath: path.join(graphingDir, "architecture.json"),
    htmlPath: path.join(graphingDir, "architecture.html"),
    mdPath: path.join(projectRoot, "ARCHITECTURE.md"),
    chartsMdPath: path.join(projectRoot, "ARCHITECTURE_CHARTS.md"),
    templatePath,
  });

  const shouldFail = computeExitCode(result, changedPaths);
  // Fold the total verdict in BEFORE rendering so the report tail reflects it.
  result.hasChanges = shouldFail;

  process.stdout.write(renderReport(result));
  process.exit(shouldFail ? 1 : 0);
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
  computeExitCode,
  orderNodes,
  renderArchitectureMd,
  renderChartsMd,
  renderReport,
  main,
};
