#!/usr/bin/env node
/**
 * archgovern CLI.
 *
 *   archgovern [config-file] [--verbose] [--no-write] [--init] [--version]
 *
 *   config-file   Path to the archgovern config (default: auto-discovered as
 *                 archgovern.config.js / .archgovern.js in the current dir).
 *   --init        Scaffold a starter config file in the current directory.
 *   --no-write    Run governance + report but do not write any files.
 *   --verbose     List all unmapped imports in the report.
 *   --version     Print the version.
 */

const fs = require("fs");
const path = require("path");

const { findConfigPath, loadConfig } = require("../lib/config");
const { runGovernance } = require("../lib/run");
const { writeOutputs } = require("../lib/write");
const { renderReport, computeExitCode } = require("../lib/render");

const pkg = require("../package.json");

const USAGE = `archgovern v${pkg.version} — zero-dependency architecture governance engine

Usage:
  archgovern [config-file] [options]

Options:
  --init         Scaffold a starter archgovern.config.js in the current directory
  --no-write     Run governance + report without writing any files
  --verbose      List all unmapped imports in the report
  --version      Print the version
  -h, --help     Show this help

Examples:
  archgovern                       # auto-discover config, verify + write outputs
  archgovern --init                # create a starter config
  archgovern ./config/my-ag.js     # use an explicit config file
  archgovern --no-write --verbose  # dry-run with full unmapped-import details
`;

const INIT_TEMPLATE = `/**
 * archgovern configuration.
 * Docs: https://github.com/you/archgovern#readme
 *
 * All keys are optional. Unset keys fall back to built-in defaults
 * (scan ./src, no aliases, no external/remote nodes).
 */
module.exports = {
  projectName: "My Project",

  // Directories (relative to this file) to scan for source code.
  sourceRoots: ["src"],

  // Node mapping: nodeId -> list of path patterns. Longest match wins.
  // NOTE: every pattern must exist on disk, otherwise the build fails.
  nodeMapping: {
    // app: ["src/app"],
    // api: ["src/api"],
  },

  // Bare packages -> node ids (discovered from import statements).
  externalPackageMap: {
    // react: "react",
    // lodash: "lodash",
  },

  // Remote nodes (no local files), discovered by regex patterns.
  remoteNodes: {
    // backend_api: {
    //   patterns: [/api\\./, /fetch\\(/],
    //   description: "Remote backend API",
    // },
  },

  // Optional: extract lists from source and embed them into descriptions.
  // derivedFacts: [
  //   {
  //     name: "endpoints",
  //     applyTo: ["api"],
  //     files: [{ type: "dir", path: "src/api", filter: /\\.ts$/ }],
  //     extract: (entries) => [...new Set(entries.flatMap((e) => e.content.match(/router\\.(get|post)\\(["'][^"']+/g) || []))],
  //     description: (items, node) => items.length ? \`REST endpoints: \${items.join(", ")}\` : null,
  //   },
  // ],

  // Curated prose must never contain these phrases.
  // curatedContentBans: [
  //   { phrase: "legacyCache", reason: "removed in v2 — replaced by SQLite" },
  // ],

  // Accuracy guards:
  //   tsconfigPaths: true  -> auto-discover compilerOptions.paths from tsconfig
  //   strictUnmappedLocal: true -> fail when a local file is imported but not
  //        covered by nodeMapping (graph incomplete)
  //   flowSymbolCheck: true -> advisory: flag flow steps calling code-like
  //        identifiers missing from the step's node (renamed functions)
  // tsconfigPaths: true,
  // strictUnmappedLocal: false,
  // flowSymbolCheck: false,

  // Output locations (relative to this file).
  dataDir: "archgovern/data",
  jsonFile: "archgovern/architecture.json",
  htmlFile: "archgovern/architecture.html",
  mdFile: "ARCHITECTURE.md",
  chartsMdFile: "ARCHITECTURE_CHARTS.md",
};
`;

function printUsage() {
  process.stdout.write(USAGE);
}

function scaffoldInit(cwd) {
  const target = path.join(cwd, "archgovern.config.js");
  if (fs.existsSync(target)) {
    process.stderr.write(`refusing to overwrite existing config: ${target}\n`);
    process.exit(1);
  }
  fs.writeFileSync(target, INIT_TEMPLATE, "utf8");
  process.stdout.write(`Created ${target}\n`);
  process.stdout.write("Next: edit nodeMapping to match your project, then run `archgovern`.\n");
}

function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const noWrite = args.includes("--no-write");
  const doInit = args.includes("--init");
  const wantVersion = args.includes("--version");
  const wantHelp = args.includes("-h") || args.includes("--help");
  const positionals = args.filter((a) => !a.startsWith("--"));

  if (wantHelp) {
    printUsage();
    process.exit(0);
  }
  if (wantVersion) {
    process.stdout.write(`archgovern v${pkg.version}\n`);
    process.exit(0);
  }
  if (doInit) {
    scaffoldInit(process.cwd());
    process.exit(0);
  }

  const cwd = process.cwd();
  const configPath = findConfigPath(cwd, positionals[0]);
  if (!configPath) {
    process.stderr.write(
      "No archgovern config found. Run `archgovern --init` to scaffold one, or pass a config path.\n",
    );
    process.exit(2);
  }

  let config;
  try {
    config = loadConfig(configPath);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(2);
  }

  const result = runGovernance({ projectRoot: config.projectRoot, config });
  result.verbose = verbose;

  const { changedPaths } = noWrite ? { changedPaths: [] } : writeOutputs(result, config);

  const shouldFail = computeExitCode(result, changedPaths);
  // Fold the total verdict in BEFORE rendering so the report tail reflects it.
  result.hasChanges = shouldFail;

  process.stdout.write(renderReport(result));
  process.exit(shouldFail ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { main, scaffoldInit, USAGE, INIT_TEMPLATE };
