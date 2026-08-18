/**
 * archgovern core pipeline.
 *
 *  1. SCAN    — walk the source roots, discover every file → node mapping
 *  2. EDGES   — parse every import, resolve to node→node edges with evidence
 *  3. FACTS   — derive structural facts (config-pluggable) and overlay them
 *               onto node descriptions
 *  4. LINT    — fail on stale terms in curated prose (config bans)
 *  5. BUILD   — assemble nodes/edges/flows, render json/md/html/charts strings
 *  6. AUDIT   — compare old vs new, report deltas (pure; never writes/never exits)
 *
 * `runGovernance` is side-effect free apart from reads. Writing happens in
 * lib/write.js and the CLI exit logic in bin/archgovern.js.
 */

const fs = require("fs");
const path = require("path");

const { walk } = require("./fs-utils");
const { extractImports } = require("./imports");
const { resolveImportToNode, detectRemoteUsage, normalizeAliases } = require("./resolve");
const { discoverTsconfigAliases } = require("./tsconfig");
const {
  validateNodeMapping,
  classifyFiles,
  buildVerifiedNodes,
  buildVerifiedEdges,
} = require("./graph");
const { deriveNodeFacts, applyDerivedDescriptions } = require("./facts");
const { scanCuratedContent, scanFlowSymbols } = require("./lint");
const { renderArchitectureMd, renderChartsMd, renderHtml } = require("./render");

function runGovernance({ projectRoot, config }) {
  const {
    sourceRoots,
    fileExtensions,
    skipDirs,
    nodeMapping,
    externalPackageMap,
    remoteNodes,
    implicitEdges,
    remoteEdges,
    derivedFacts,
    curatedContentBans,
    orderedLayers,
    layerClasses,
    dataDir,
    templateFile,
  } = config;

  const walkOpts = { extensions: fileExtensions, skipDirs };

  // ==========================================================================
  //  ALIAS RESOLUTION — explicit config aliases, merged with tsconfig paths
  // ==========================================================================

  const tsconfigAliases = discoverTsconfigAliases({
    projectRoot,
    sourceRoots,
    tsconfigPaths: config.tsconfigPaths,
  });
  const aliases = normalizeAliases(config.aliases, tsconfigAliases);

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

  const allFiles = [];
  for (const root of sourceRoots) {
    allFiles.push(...walk(path.join(projectRoot, root), walkOpts));
  }
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
  const droppedImports = []; // { fromNode, targetPath, reason, files:[...] }
  const droppedImportKey = new Map(); // fromNode|targetPath|reason → entry (dedup)

  const resolveOpts = {
    projectRoot,
    sourceRoots,
    aliases,
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

    // Detect remote usage — a file that directly invokes a remote API
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

    // Implicit edges — when `source`'s file matches a marker, add edges to
    // each configured remote target (e.g. supabase client construction).
    for (const { source, targets, marker } of implicitEdges) {
      if (fromNode !== source) continue;
      const matchIndex = content.search(marker);
      if (matchIndex === -1) continue;
      const lineStart = content.lastIndexOf("\n", matchIndex) + 1;
      const lineEndIdx = content.indexOf("\n", matchIndex);
      const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;
      const evidence = {
        file: path.relative(projectRoot, file).replace(/\\/g, "/"),
        lineNum: content.slice(0, matchIndex).split("\n").length,
        snippet: content.slice(lineStart, lineEnd).trim(),
      };
      for (const remoteId of targets) {
        const key = `${source}->${remoteId}`;
        if (edgeEvidence.has(key)) continue;
        discoveredRemotes.add(remoteId);
        edgeEvidence.set(key, [evidence]);
      }
    }
  }

  // Remote-to-remote edges — scan `dir` for files matching `target`'s patterns
  // (plus the entry's extraPatterns), then add an edge source -> target.
  for (const { source, target, dir, extraPatterns = [] } of remoteEdges) {
    const targetConfig = remoteNodes[target];
    if (!targetConfig) continue;
    const absDir = path.join(projectRoot, dir);
    if (!fs.existsSync(absDir)) continue;
    discoveredRemotes.add(source);
    const patterns = {
      [target]: {
        patterns: [...(targetConfig.patterns || []), ...extraPatterns],
      },
    };
    const files = walk(absDir, walkOpts);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const usage = detectRemoteUsage(content, patterns);
      if (usage.length === 0) continue;
      const key = `${source}->${target}`;
      if (!edgeEvidence.has(key)) edgeEvidence.set(key, []);
      edgeEvidence.get(key).push({
        file: path.relative(projectRoot, file).replace(/\\/g, "/"),
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

  // Overlay deterministic derived descriptions so those fields track the code.
  const facts = deriveNodeFacts({ config, projectRoot });
  const derivedNodes = applyDerivedDescriptions(verifiedNodes, facts);

  const { verifiedArchEdges, verifiedFlowEdges, verifiedEdges } = buildVerifiedEdges(
    edgeEvidence,
    existingEdges,
    existingFlowTriggerEdges,
    allNodeIds,
  );

  // Curated-content lint — prose referencing deleted/stale terms fails the build.
  const contentViolations = scanCuratedContent({
    nodes: derivedNodes,
    edges: verifiedEdges,
    flows: existingFlows,
    bans: curatedContentBans,
  });

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

  // Advisory flow-symbol drift check (renamed functions in curated prose).
  const flowSymbolWarnings = config.flowSymbolCheck
    ? scanFlowSymbols({
        flows: existingFlows,
        nodeToFiles,
        allNodeIds,
        readFile: (file) => fs.readFileSync(file, "utf8"),
      })
    : [];

  // ==========================================================================
  //  PRE-RENDER OUTPUT STRINGS (never written here)
  // ==========================================================================

  const architecture = {
    nodes: derivedNodes,
    edges: verifiedEdges,
    flows: existingFlows,
  };

  const jsonString = JSON.stringify(architecture, null, 2);

  let htmlString = null;
  if (templateFile) {
    const templateAbs = path.isAbsolute(templateFile)
      ? templateFile
      : path.join(projectRoot, templateFile);
    htmlString = renderHtml(architecture, templateAbs);
  }

  const mdString = renderArchitectureMd(derivedNodes, existingFlows, orderedLayers, config.projectName);
  const chartsMdString = renderChartsMd(
    derivedNodes,
    verifiedArchEdges,
    orderedLayers,
    layerClasses,
    config.projectName,
  );

  // ==========================================================================
  //  GOVERNANCE DELTAS (report + exit code inputs)
  // ==========================================================================

  const oldNodeIds = new Set(existingNodes.map((n) => n.id));
  const newNodeIds = allNodeIds;
  const removedNodes = [...oldNodeIds].filter((id) => !newNodeIds.has(id));
  const addedNodes = [...newNodeIds].filter((id) => !oldNodeIds.has(id));

  const oldEdgeKeys = new Set(
    existingEdges.filter((e) => e.id).map((e) => `${e.source}->${e.target}`),
  );
  const newEdgeKeys = new Set(verifiedArchEdges.map((e) => `${e.source}->${e.target}`));
  const removedEdges = [...oldEdgeKeys].filter((k) => !newEdgeKeys.has(k));
  const addedEdges = [...newEdgeKeys].filter((k) => !oldEdgeKeys.has(k));

  const nodesJsContent = `module.exports = ${JSON.stringify(derivedNodes, null, 2)};\n`;
  const edgesJsContent = `module.exports = ${JSON.stringify(verifiedEdges, null, 2)};\n`;

  const oldNodesContent = fs.existsSync(path.join(dataDir, "nodes.js"))
    ? fs.readFileSync(path.join(dataDir, "nodes.js"), "utf8")
    : "";
  const oldEdgesContent = fs.existsSync(path.join(dataDir, "edges.js"))
    ? fs.readFileSync(path.join(dataDir, "edges.js"), "utf8")
    : "";

  const nodesChanged = nodesJsContent !== oldNodesContent;
  const edgesChanged = edgesJsContent !== oldEdgesContent;

  // Strict mode: local files imported but not covered by nodeMapping mean the
  // graph is incomplete — fail the build instead of just advising.
  const unmappedLocalImports =
    config.strictUnmappedLocal === true
      ? droppedImports.filter((d) => d.reason === "resolved-unmapped")
      : [];
  const strictLocalFail = unmappedLocalImports.length > 0;

  const hasChanges =
    nodesChanged ||
    edgesChanged ||
    removedNodes.length > 0 ||
    addedNodes.length > 0 ||
    removedEdges.length > 0 ||
    addedEdges.length > 0 ||
    stalePatterns.length > 0 ||
    flowWarnings.length > 0 ||
    contentViolations.length > 0 ||
    strictLocalFail ||
    (staleMetadataPaths && staleMetadataPaths.length > 0);

  return {
    verifiedNodes: derivedNodes,
    verifiedArchEdges,
    verifiedFlowEdges,
    verifiedEdges,
    allNodeIds,
    existingNodes,
    existingEdges,
    existingFlowTriggerEdges,
    nodeToFiles,
    flowWarnings,
    flowSymbolWarnings,
    contentViolations,
    unmappedLocalImports,
    strictLocalFail,
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

module.exports = { runGovernance };
