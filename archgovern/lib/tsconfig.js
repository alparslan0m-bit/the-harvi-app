/**
 * tsconfig `paths` auto-discovery for archgovern.
 *
 * Reads `compilerOptions.paths` from a project's tsconfig files (optionally
 * following local `extends` chains) and converts them to alias entries in the
 * form `{ prefix, base, anchor: "projectRoot" }`, where `base` is resolved to a
 * PROJECT-ROOT-RELATIVE path (using each config's `baseUrl`, defaulting to the
 * tsconfig's own directory) and may contain a `*` wildcard:
 *
 *   <root>/tsconfig.json        "@/*": ["./*"]            -> { "@",  "./*" }
 *   <root>/tsconfig.json        "@components/*": ["./ui/*"] -> { "@components", "./ui/*" }
 *   <src-root>/tsconfig.json    "@/*": ["./*"]  (baseUrl ".") -> { "@", "<src-root>/*" }
 *
 * Lookup order: `<projectRoot>/tsconfig.json`, then each `<sourceRoot>/tsconfig.json`.
 */

const fs = require("fs");
const path = require("path");

// Minimal JSONC handling: drop // and /* */ comments before parsing, while
// keeping string literal contents intact (e.g. path patterns like "./src/*"
// must not be mistaken for a comment).
function stripJsonComments(text) {
  let out = "";
  let i = 0;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    if (ch === '"') {
      // Copy a JSON string verbatim (respecting escapes).
      out += ch;
      i++;
      while (i < len) {
        out += text[i];
        if (text[i] === "\\" && i + 1 < len) {
          out += text[i + 1];
          i += 2;
          continue;
        }
        if (text[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < len && text[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < len && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function parseTsconfig(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(stripJsonComments(raw));
  } catch (_) {
    return null;
  }
}

// Collect { paths, baseUrl } from a tsconfig, following local `extends` chains.
// Package-name extends (e.g. "expo/tsconfig.base") resolve to node_modules and
// their paths are not project aliases — skipped.
function collectTsconfigInfo(file, maxDepth = 3) {
  if (!file || maxDepth <= 0) return null;
  const json = parseTsconfig(file);
  if (!json) return null;

  let inherited = null;
  if (typeof json.extends === "string" && json.extends.startsWith(".")) {
    const parent = path.resolve(path.dirname(file), json.extends);
    if (fs.existsSync(parent)) inherited = collectTsconfigInfo(parent, maxDepth - 1);
  }

  const opts = json.compilerOptions || {};
  const baseUrl = inherited?.baseUrl ?? opts.baseUrl ?? ".";
  const paths = { ...(inherited?.paths || {}), ...(opts.paths || {}) };
  return { baseUrl, paths };
}

// Convert a single tsconfig's paths to projectRoot-relative alias entries.
// Returns [{ prefix, base, anchor }] where anchor is always "projectRoot".
function tsconfigPathsToAliases(paths, anchorDir, projectRoot) {
  const entries = [];
  const rel = path.relative(projectRoot, anchorDir).replace(/\\/g, "/") || ".";
  for (const [key, targets] of Object.entries(paths || {})) {
    const first = Array.isArray(targets) ? targets[0] : undefined;
    if (typeof first !== "string") continue;
    const prefix = key.endsWith("/*") ? key.slice(0, -2) : key;
    let template = first.replace(/^\.\//, "");
    if (key.endsWith("/*") && !template.includes("*")) template += "*";
    const base = rel === "." ? template : `${rel}/${template}`;
    entries.push({ prefix, base, anchor: "projectRoot" });
  }
  return entries;
}

// Discover tsconfig-derived aliases. `config.tsconfigPaths` may be:
//   true      -> <projectRoot>/tsconfig.json + each <sourceRoot>/tsconfig.json
//   "<path>"  -> explicit tsconfig file (relative to projectRoot)
//   false     -> off
// Returns an array of { prefix, base, anchor } entries.
function discoverTsconfigAliases({ projectRoot, sourceRoots, tsconfigPaths }) {
  if (!tsconfigPaths) return [];

  const files = [];
  if (typeof tsconfigPaths === "string") {
    files.push(path.resolve(projectRoot, tsconfigPaths));
  } else {
    files.push(path.join(projectRoot, "tsconfig.json"));
    for (const root of sourceRoots) {
      files.push(path.join(projectRoot, root, "tsconfig.json"));
    }
  }

  const entries = [];
  const seenPrefixes = new Set();
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const info = collectTsconfigInfo(file);
    if (!info) continue;
    const anchorDir = path.resolve(path.dirname(file), info.baseUrl);
    for (const entry of tsconfigPathsToAliases(info.paths, anchorDir, projectRoot)) {
      if (seenPrefixes.has(entry.prefix)) continue;
      seenPrefixes.add(entry.prefix);
      entries.push(entry);
    }
  }
  return entries;
}

module.exports = { discoverTsconfigAliases, tsconfigPathsToAliases, stripJsonComments };