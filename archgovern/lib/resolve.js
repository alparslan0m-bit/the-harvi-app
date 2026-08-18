/**
 * Import → node resolution for archgovern.
 *
 * Resolves a module specifier to a graph node by checking, in order:
 *   1. external packages (bare specifiers in externalPackageMap)
 *   2. path aliases (config `aliases` + auto-discovered tsconfig `paths`)
 *   3. relative imports (./ ../), including barrel-file re-export tracing
 *
 * If no candidate exists on disk, or the file is not covered by any
 * nodeMapping pattern, a non-fatal reason is returned instead.
 *
 * Accuracy guarantees over a naive implementation:
 *   • Barrel re-exports are traced on COMMENT-STRIPPED content, so a comment
 *     like `// export * from './fake'` can never create a phantom edge.
 *   • CommonJS barrels are traced too: `module.exports = require(...)` and
 *     `exports.foo = require(...)`, not just `export ... from`.
 *   • tsconfig `paths` aliases are discovered automatically (explicit config
 *     `aliases` always win), including wildcard `*` substitution.
 */

const fs = require("fs");
const path = require("path");
const { stripCommentsAndStrings } = require("./imports");

// Normalize config aliases ({ "@": "src" }) and tsconfig-derived aliases into
// a single internal list. Config aliases are anchored to each source root;
// tsconfig-derived aliases are already project-root-relative. Explicit config
// aliases take precedence over tsconfig-derived ones for the same prefix.
function normalizeAliases(configAliases = {}, tsconfigAliasEntries = []) {
  const out = [];
  const seen = new Set();

  for (const [alias, target] of Object.entries(configAliases)) {
    const prefix = alias.endsWith("/*") ? alias.slice(0, -2) : alias;
    out.push({ prefix, base: String(target), anchor: "sourceRoot", wildcard: true });
    seen.add(prefix);
  }

  for (const entry of tsconfigAliasEntries) {
    if (seen.has(entry.prefix)) continue; // explicit config wins
    out.push({ ...entry, wildcard: true });
  }

  return out;
}

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
  const matchedAlias = aliases.find(
    (a) => importPath === a.prefix || importPath.startsWith(a.prefix + "/"),
  );
  if (!isRelative && !matchedAlias) {
    // Bare specifier that is not in externalPackageMap: its target is never a node.
    return { nodeId: null, reason: "external-unmapped", targetPath: importPath };
  }

  // Build candidate absolute paths.
  let fullPathBases = [];
  if (matchedAlias) {
    const rest = importPath === matchedAlias.prefix
      ? ""
      : importPath.slice(matchedAlias.prefix.length + 1);
    // Substitute the wildcard, or append the rest.
    let target = matchedAlias.base;
    if (target.includes("*")) {
      target = target.replace("*", rest);
    } else if (rest) {
      target = path.join(target, rest);
    }
    if (matchedAlias.anchor === "projectRoot") {
      fullPathBases = [path.join(projectRoot, target)];
    } else {
      for (const sourceRoot of sourceRoots) {
        fullPathBases.push(path.join(projectRoot, sourceRoot, target));
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
      fullPathBase + ".jsx",
      fullPathBase + ".js",
      fullPathBase + ".mjs",
      fullPathBase + ".cjs",
      path.join(fullPathBase, "index.tsx"),
      path.join(fullPathBase, "index.ts"),
      path.join(fullPathBase, "index.jsx"),
      path.join(fullPathBase, "index.js"),
      path.join(fullPathBase, "index.mjs"),
      path.join(fullPathBase, "index.cjs"),
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

      // For barrel files that re-export, trace what they export.
      const stat = fs.statSync(candidate);
      if (!stat.isFile()) continue;

      resolvedFile = resolvedFile || candidate;

      if (!visited.has(candidate)) {
        visited.add(candidate);
        const traced = traceReExports(candidate, opts, visited);
        if (traced && traced.nodeId) return traced;
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

// Trace every re-export of a barrel file to its target node. Runs on
// comment-stripped content so commented-out re-exports are ignored. Supports
// ESM (`export * from`, `export { a } from`, `export * as ns from`) and
// CommonJS (`module.exports = require(...)`, `exports.foo = require(...)`).
function traceReExports(barrelFile, opts, visited) {
  const content = stripCommentsAndStrings(fs.readFileSync(barrelFile, "utf8"));
  const reExportRegexes = [
    /export\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
    /module\.exports\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /exports\.[A-Za-z0-9_$]+\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /module\.exports\s*=\s*exports\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of reExportRegexes) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const resolved = resolveImportToNode(m[1], barrelFile, opts, visited);
      if (resolved && resolved.nodeId) return resolved;
    }
  }
  return null;
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

module.exports = { resolveImportToNode, detectRemoteUsage, normalizeAliases, traceReExports };