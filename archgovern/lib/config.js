/**
 * Config loading, merging, and validation for archgovern.
 *
 * A config file is a CommonJS module that exports a plain object (or a
 * function returning one) with the schema described in README.md. All keys
 * are optional; sensible defaults are applied for anything not provided.
 */

const fs = require("fs");
const path = require("path");

// Default configuration. Kept minimal and generic so the tool works with
// zero config on a typical JS/TS project (all sources under ./src).
const DEFAULT_CONFIG = {
  // Human-readable project name used in generated docs.
  projectName: "Architecture",

  // Directories (relative to the config file / project root) to scan.
  sourceRoots: ["src"],

  // File extensions considered part of the codebase.
  fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],

  // Directories always pruned during the walk (recursively).
  skipDirs: [
    "node_modules",
    ".git",
    ".hg",
    ".svn",
    ".expo",
    ".next",
    ".nuxt",
    "dist",
    "build",
    "out",
    "coverage",
    ".cache",
    "ios",
    "android",
    "Pods",
  ],

  // Path alias map, e.g. { "@": "src" } turns "@/lib/api" into "src/lib/api"
  // under each source root. An empty target maps to the source root itself.
  // Explicit aliases always win over tsconfig-discovered ones.
  aliases: {},

  // Auto-discover `compilerOptions.paths` from tsconfig files and merge them
  // into aliases (explicit `aliases` win). true = discover from
  // <projectRoot>/tsconfig.json + each <sourceRoot>/tsconfig.json (following
  // local `extends`); a string = explicit tsconfig path; false = off.
  tsconfigPaths: true,

  // nodeId -> array of path patterns (relative to project root). Longest
  // pattern wins when multiple nodes could claim the same file.
  nodeMapping: {},

  // Bare package specifier -> nodeId (discovered from import statements).
  // e.g. { "react": "react", "@tanstack/react-query": "react_query" }
  externalPackageMap: {},

  // Remote nodes (no local files). Added to the graph when a pattern matches.
  // e.g. { supabase_auth: { patterns: [/supabase\.auth\./], description: "..." } }
  remoteNodes: {},

  // Implicit edges: when `source`'s file matches `marker`, add edges to
  // each `targets` remote. e.g. supabase client construction.
  implicitEdges: [],

  // Remote-to-remote edges derived by scanning a directory: when a file under
  // `dir` matches any of `target`'s patterns (plus `extraPatterns`), add an
  // edge `source -> target`.
  remoteEdges: [],

  // Pluggable derived facts: structurally-extracted lists (tables, RPCs, edge
  // functions, ...) overlaid onto node descriptions so those can never drift.
  // See README.md for the schema.
  derivedFacts: [],

  // Hand-authored prose (node/edge/flow text) must never contain these terms.
  // Any hit fails the build. Each entry: { phrase, reason }.
  curatedContentBans: [],

  // Accuracy guards (see README):
  // strictUnmappedLocal — fail the build when a LOCAL file is imported but is
  //   not covered by any nodeMapping pattern (i.e. the graph is incomplete).
  // flowSymbolCheck — advisory only: flag flow-step actions that reference an
  //   identifier (word immediately before a `(`) absent from every file of the
  //   step's node. Catches renamed functions in curated flow prose.
  strictUnmappedLocal: false,
  flowSymbolCheck: false,

  // Layer order used when rendering markdown/charts.
  orderedLayers: ["presentation", "application", "infrastructure", "external"],

  // Mermaid classDef styles keyed by layer name, plus an `unknown` fallback.
  layerClasses: {},

  // Output locations (all relative to the project root). dataDir holds the
  // round-tripped curated metadata (nodes.js / edges.js / flows.js); flows.js
  // is read-only and never overwritten.
  dataDir: "archgovern/data",
  jsonFile: "archgovern/architecture.json",
  htmlFile: "archgovern/architecture.html",
  mdFile: "ARCHITECTURE.md",
  chartsMdFile: "ARCHITECTURE_CHARTS.md",

  // HTML template path. If set, must contain the "__ARCHITECTURE_JSON__"
  // placeholder. Defaults to the template shipped with this package.
  templateFile: null,
};

// Candidates searched (in order) when no explicit config path is given.
const CONFIG_FILENAMES = [
  "archgovern.config.js",
  "archgovern.config.cjs",
  ".archgovern.js",
  ".archgovern.cjs",
];

/** Resolve the config file path given a CLI positional argument. */
function findConfigPath(cwd, explicitPath) {
  if (explicitPath) {
    const abs = path.resolve(cwd, explicitPath);
    return fs.existsSync(abs) ? abs : null;
  }
  for (const name of CONFIG_FILENAMES) {
    const candidate = path.join(cwd, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function deepMerge(base, override) {
  if (override === undefined || override === null) return base;
  if (Array.isArray(base)) return override;
  if (typeof base === "object" && typeof override === "object") {
    const out = { ...base };
    for (const key of Object.keys(override)) {
      out[key] = deepMerge(base[key], override[key]);
    }
    return out;
  }
  return override;
}

/** Load + merge + validate a config file. Throws on fatal config errors. */
function loadConfig(configPath) {
  const absolute = path.resolve(configPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Config file not found: ${absolute}`);
  }
  // eslint-disable-next-line global-require
  const loaded = require(absolute);
  const userConfig =
    typeof loaded === "function" ? loaded({ projectRoot: path.dirname(absolute) }) : loaded;
  if (!userConfig || typeof userConfig !== "object") {
    throw new Error(`Config file must export an object or a function returning one: ${absolute}`);
  }

  const config = deepMerge(DEFAULT_CONFIG, userConfig);

  // projectRoot defaults to the config file's directory; a config may override
  // it (absolute, or relative to the config file) so the config can live in a
  // subfolder while paths stay relative to the project root.
  config.projectRoot = userConfig.projectRoot
    ? path.resolve(path.dirname(absolute), userConfig.projectRoot)
    : path.dirname(absolute);

  // Default to the HTML template bundled with this package.
  if (!config.templateFile) {
    config.templateFile = path.join(__dirname, "..", "template.html");
  }

  // Resolve all output locations to absolute paths against projectRoot so
  // later stages don't depend on the process working directory.
  for (const key of ["dataDir", "jsonFile", "htmlFile", "mdFile", "chartsMdFile"]) {
    config[key] = path.resolve(config.projectRoot, config[key]);
  }

  validateConfig(config);
  return config;
}

function validateConfig(config) {
  const problems = [];

  if (!Array.isArray(config.sourceRoots) || config.sourceRoots.length === 0) {
    problems.push("sourceRoots must be a non-empty array of directories");
  }
  if (!Array.isArray(config.fileExtensions) || config.fileExtensions.length === 0) {
    problems.push("fileExtensions must be a non-empty array of extensions");
  }
  if (typeof config.nodeMapping !== "object" || config.nodeMapping === null) {
    problems.push("nodeMapping must be an object");
  }

  for (const [nodeId, patterns] of Object.entries(config.nodeMapping)) {
    if (!Array.isArray(patterns) || patterns.length === 0) {
      problems.push(`nodeMapping.${nodeId} must be an array of path patterns`);
    }
  }
  for (const [pkg, nodeId] of Object.entries(config.externalPackageMap)) {
    if (typeof nodeId !== "string") {
      problems.push(`externalPackageMap.${pkg} must map to a node id string`);
    }
  }
  for (const [remoteId, remote] of Object.entries(config.remoteNodes)) {
    if (!remote || !Array.isArray(remote.patterns)) {
      problems.push(`remoteNodes.${remoteId} needs a patterns array`);
    }
  }
  for (const [i, edge] of (config.implicitEdges || []).entries()) {
    if (!edge.source || !Array.isArray(edge.targets) || !edge.marker) {
      problems.push(`implicitEdges[${i}] needs { source, targets[], marker }`);
    }
  }
  for (const [i, edge] of (config.remoteEdges || []).entries()) {
    if (!edge.source || !edge.target || !edge.dir) {
      problems.push(`remoteEdges[${i}] needs { source, target, dir }`);
    }
  }
  for (const [i, fact] of (config.derivedFacts || []).entries()) {
    if (!fact.name || !Array.isArray(fact.applyTo)) {
      problems.push(`derivedFacts[${i}] needs { name, applyTo[] }`);
    }
  }
  for (const [i, ban] of (config.curatedContentBans || []).entries()) {
    if (!ban || typeof ban.phrase !== "string") {
      problems.push(`curatedContentBans[${i}] needs a phrase string`);
    }
  }
  if (typeof config.strictUnmappedLocal !== "boolean") {
    problems.push("strictUnmappedLocal must be a boolean");
  }
  if (typeof config.flowSymbolCheck !== "boolean") {
    problems.push("flowSymbolCheck must be a boolean");
  }
  if (config.tsconfigPaths !== false && config.tsconfigPaths !== true && typeof config.tsconfigPaths !== "string") {
    problems.push("tsconfigPaths must be a boolean or a tsconfig file path");
  }

  if (problems.length > 0) {
    throw new Error(`Invalid archgovern config:\n  - ${problems.join("\n  - ")}`);
  }
}

module.exports = {
  DEFAULT_CONFIG,
  CONFIG_FILENAMES,
  findConfigPath,
  loadConfig,
  validateConfig,
  deepMerge,
};
