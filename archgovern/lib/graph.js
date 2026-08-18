/**
 * Node/edge graph construction for archgovern: validates the curated
 * nodeMapping against disk, classifies every source file to a node, and
 * builds the verified node + edge lists while round-tripping existing
 * curated metadata.
 */

const fs = require("fs");
const path = require("path");

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

// Map each source file to its node. `projectRoot` is needed to compute the
// project-relative path used to match `nodeMapping` patterns.
function classifyFiles(allFiles, sortedPatterns, projectRoot) {
  const fileToNode = new Map(); // abs path → nodeId
  const nodeToFiles = new Map(); // nodeId → abs path[]
  const discoveredLocalNodes = new Set();

  function classifyFile(absFilePath) {
    const rel = path.relative(projectRoot, absFilePath).replace(/\\/g, "/");

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

// Build the verified node list, round-tripping existing curated metadata.
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
    (externalPackageMap && Object.values(externalPackageMap).includes(id)) ||
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

// Build the verified edge list, round-tripping existing metadata.
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

module.exports = {
  validateNodeMapping,
  classifyFiles,
  buildVerifiedNodes,
  buildVerifiedEdges,
};
