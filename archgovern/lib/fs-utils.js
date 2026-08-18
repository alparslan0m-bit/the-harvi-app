/**
 * Filesystem walking for archgovern.
 */

const fs = require("fs");
const path = require("path");

/**
 * Recursively list all files under `root` matching one of `extensions`,
 * skipping `skipDirs` anywhere in the tree.
 */
function walk(root, { extensions = [".ts", ".tsx", ".js", ".jsx"], skipDirs = [] } = {}) {
  const results = [];
  const skip = new Set(skipDirs);
  let list;
  try {
    list = fs.readdirSync(root);
  } catch (_) {
    return results;
  }
  for (const file of list) {
    const full = path.join(root, file);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch (_) {
      continue;
    }
    if (stat.isDirectory()) {
      if (skip.has(file)) continue;
      results.push(...walk(full, { extensions, skipDirs }));
    } else if (extensions.some((ext) => full.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

/** List immediate subdirectory names (no leading dots) under `root`. */
function listSubdirNames(root) {
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch (_) {
    return [];
  }
}

/**
 * Read a set of inputs described by a derivedFact `files` entry. Returns an
 * array of { path, content? } where content is present for file/dir inputs.
 * Supported input types:
 *   { type: "file", path }                 -> single file
 *   { type: "dir", path, filter?, recursive? } -> files under a directory
 *   { type: "dirNames", path }             -> subdirectory names (content absent)
 */
function collectInputs(input, { extensions, skipDirs, projectRoot }) {
  const absRoot = path.resolve(projectRoot, input.path);
  if (input.type === "file") {
    try {
      return [{ path: input.path, content: fs.readFileSync(absRoot, "utf8") }];
    } catch (_) {
      return [];
    }
  }
  if (input.type === "dirNames") {
    return listSubdirNames(absRoot).map((name) => ({ path: name }));
  }
  if (input.type === "dir") {
    const opts = { extensions, skipDirs };
    const files = walk(absRoot, opts);
    const filter = input.filter instanceof RegExp ? (p) => filter.test(p) : input.filter;
    return files
      .filter((f) => (filter ? filter(f) : true))
      .map((f) => {
        const rel = path.relative(projectRoot, f).replace(/\\/g, "/");
        try {
          return { path: rel, content: fs.readFileSync(f, "utf8") };
        } catch (_) {
          return { path: rel };
        }
      });
  }
  return [];
}

module.exports = { walk, listSubdirNames, collectInputs };
