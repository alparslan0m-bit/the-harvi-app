/**
 * Import → node resolution for archgovern.
 *
 * Resolves a module specifier to a graph node by checking, in order:
 *   1. external packages (bare specifiers in externalPackageMap)
 *   2. path aliases (aliases config, e.g. "@" -> "src")
 *   3. relative imports (./ ../), including barrel-file re-export tracing
 * If no candidate exists on disk, or the file is not covered by any
 * nodeMapping pattern, a non-fatal reason is returned instead.
 */

const fs = require("fs");
const path = require("path");

function resolveImportToNode(importPath, currentFile, opts, visited) {
  if (!visited) visited = new Set();
  const {
    projectRoot,
    sourceRoots,
    aliases,
    externalPackageMap,
    fileToNode,
    classifyFile,
    discoveredExternals,
  } = opts;

  // Check external packages
  for (const [pkg, nodeId] of Object.entries(externalPackageMap)) {
    if (importPath === pkg || importPath.startsWith(pkg + "/")) {
      discoveredExternals.add(nodeId);
      return { nodeId };
    }
  }

  const isRelative = importPath.startsWith("./") || importPath.startsWith("../");
  const isAliased = Object.keys(aliases).some(
    (key) => importPath === key + "/" || importPath.startsWith(key + "/"),
  );
  if (!isRelative && !isAliased) {
    // Bare specifier that is not in externalPackageMap: its target is never a node.
    return { nodeId: null, reason: "external-unmapped", targetPath: importPath };
  }

  // Build candidate absolute paths for aliased imports.
  let fullPathBases = [];
  if (isAliased) {
    for (const [alias, target] of Object.entries(aliases)) {
      const prefix = alias + "/";
      if (importPath.startsWith(prefix)) {
        const rest = importPath.substring(prefix.length);
        for (const sourceRoot of sourceRoots) {
          fullPathBases.push(path.join(projectRoot, sourceRoot, target, rest));
        }
      }
    }
  } else {
    fullPathBases = [path.join(path.dirname(currentFile), importPath)];
  }

  for (const fullPathBase of fullPathBases) {
    // Try resolve with extensions and index files
    const candidates = [
      fullPathBase,
      fullPathBase + ".tsx",
      fullPathBase + ".ts",
      fullPathBase + ".js",
      fullPathBase + ".jsx",
      path.join(fullPathBase, "index.ts"),
      path.join(fullPathBase, "index.tsx"),
      path.join(fullPathBase, "index.js"),
      path.join(fullPathBase, "index.jsx"),
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
      if (!visited.has(candidate)) {
        visited.add(candidate);
        while ((reMatch = reExportRegex.exec(content)) !== null) {
          const resolved = resolveImportToNode(reMatch[1], candidate, opts, visited);
          if (resolved.nodeId) return resolved;
        }
      }
    }

    if (resolvedFile) {
      // Resolved on disk to a file, but no nodeMapping pattern covers it.
      return { nodeId: null, reason: "resolved-unmapped", targetPath: path.resolve(resolvedFile) };
    }
  }

  // No candidate exists on disk (no file, no index.*).
  return {
    nodeId: null,
    reason: "unresolvable",
    targetPath: fullPathBases.map((p) => path.resolve(p)).join(", ") || path.resolve(importPath),
  };
}

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

module.exports = { resolveImportToNode, detectRemoteUsage };
