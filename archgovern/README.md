# archgovern

**Zero-dependency architecture governance engine.** Scans your codebase, derives a
verified dependency graph (nodes, edges, flows), and renders `ARCHITECTURE.md`
plus an interactive HTML visualization. If the code drifts from the documented
architecture, **the build fails**.

- 🪶 **Zero dependencies** — pure Node.js (≥ 18), no install step beyond the package itself.
- 🧩 **Project-agnostic** — every assumption (source dirs, aliases, node mapping,
  remote APIs, derived facts, output paths) lives in one config file. Works for
  React, Vue, Express, monorepos, apps, libraries — anything with source files.
- 🎯 **Accuracy-first** — import extraction and barrel tracing are comment-safe,
  CommonJS-aware, and path aliases are auto-discovered from `tsconfig.json`.
  No phantom edges from commented-out code.
- 🔁 **Idempotent** — run it twice and the second run exits 0 with no file changes.
- 🛡 **Anti-drift** — structurally-extracted facts (table lists, RPCs, endpoints…)
  are overlaid onto node descriptions, and curated prose is linted against
  banned stale terms. Hand-written descriptions cannot silently rot.
- 🗺 **Flow aware** — curated user-journey/sequence flows are validated against
  the graph (missing nodes fail the build).

## Quick start

```bash
npx archgovern --init          # scaffold archgovern.config.js
# ... edit nodeMapping to match your project ...
npx archgovern                 # scan → verify → write ARCHITECTURE.md + HTML
npx archgovern                 # run again: exits 0, "GOVERNANCE CHECK PASSED"
```

Typical output:

```
📦 NODES: 38 total   ✅ Verified: 38
🔗 ARCHITECTURAL EDGES: 138 total   ✅ Verified: 138
🔄 FLOW TRIGGER EDGES: 51 kept
✅ GOVERNANCE CHECK PASSED — architecture graph matches codebase.
```

Generated files:

| File | Purpose |
| --- | --- |
| `ARCHITECTURE.md` | Human/AI-readable architecture doc (nodes by layer + flows) |
| `ARCHITECTURE_CHARTS.md` | Mermaid flowchart for your renderer/CI |
| `architecture.html` | Interactive Cytoscape graph (self-contained, CDN assets) |
| `architecture.json` | Machine-readable `{ nodes, edges, flows }` |
| `data/nodes.js`, `data/edges.js` | Round-tripped curated metadata (auto-regenerated) |
| `data/flows.js` | **Curated** user journeys — edit by hand, never overwritten |

## Install / run

```bash
npm install -g archgovern   # or: npx archgovern
archgovern [config-file] [options]
```

Options:

| Flag | Meaning |
| --- | --- |
| `--init` | Scaffold a starter config in the current directory |
| `--no-write` | Run governance + report without writing any files |
| `--verbose` | List every unmapped import in the report |
| `--version` / `-h` | Version / help |

Exit codes:

| Code | Meaning |
| --- | --- |
| `0` | Governance passed — graph matches code, nothing changed |
| `1` | Governance failed — drift detected and/or files were written; **re-run to confirm** |
| `2` | Config error (missing file, invalid schema) |

## Configuration

A config file is a CommonJS module exporting an object (or a function
`(ctx) => config`). All keys are optional; defaults are shown below.

```js
// archgovern.config.js
module.exports = {
  projectName: "My Project",          // title used in generated docs

  // ── scanning ────────────────────────────────────────────────────────────
  sourceRoots: ["src"],               // dirs to walk (relative to project root)
  fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  skipDirs: ["node_modules", ".git", ".expo", ".next", "dist", "build", ...],
  aliases: { "@": "src" },            // "@/lib/api" → "src/lib/api" per source root
  tsconfigPaths: true,                // auto-discover compilerOptions.paths from
                                      // tsconfig files (explicit aliases win)

  // ── the graph ───────────────────────────────────────────────────────────
  nodeMapping: {                      // nodeId -> path patterns (longest match wins)
    app: ["src/app"],
    api: ["src/api"],
  },
  externalPackageMap: {               // bare package -> nodeId (from imports)
    react: "react",
    "@tanstack/react-query": "react_query",
  },
  remoteNodes: {                      // no files; added when a pattern matches
    backend: {
      patterns: [/api\./, /fetch\(/],
      description: "Remote backend API",
    },
  },
  implicitEdges: [                    // source's file matches `marker` → edges to targets
    { source: "api_client", targets: ["backend", "auth"], marker: /createClient\(/ },
  ],
  remoteEdges: [                      // scan a dir; a file matching target's patterns adds an edge
    {
      source: "edge_functions",
      target: "database",
      dir: "functions",
      extraPatterns: [/\.query\(/],
    },
  ],

  // ── derived facts (anti-drift descriptions) ──────────────────────────────
  derivedFacts: [
    {
      name: "endpoints",
      applyTo: ["api"],
      files: [{ type: "dir", path: "src/api", filter: /\.ts$/ }], // file | dir | dirNames
      extract: (entries) => [...],   // entries: [{ path, content? }]
      description: (items, node) =>  // return null/undefined to keep the node as-is
        items.length ? `REST endpoints: ${items.join(", ")}` : null,
    },
  ],

  // ── curated prose guard ──────────────────────────────────────────────────
  curatedContentBans: [
    { phrase: "legacyCache", reason: "removed in v2 — replaced by SQLite" },
  ],

  // ── accuracy guards ──────────────────────────────────────────────────────
  // Fail the build when a LOCAL file is imported but not covered by nodeMapping
  // (i.e. the graph is incomplete). Off by default — those are advisory.
  strictUnmappedLocal: false,
  // Advisory only: flag flow-step actions that CALL a code-like identifier
  // (CamelCase / snake_case, e.g. `BackButton(`) that appears in no file of
  // the step's node. Skips member accesses (`supabase.auth.signUp(`) and
  // plain prose words. Catches renamed functions in curated flow prose.
  // Never fails the build.
  flowSymbolCheck: false,

  // ── rendering ────────────────────────────────────────────────────────────
  orderedLayers: ["presentation", "application", "infrastructure", "external"],
  layerClasses: { /* mermaid classDef styles per layer */ },

  // ── output (relative to project root) ────────────────────────────────────
  dataDir: "archgovern/data",
  jsonFile: "archgovern/architecture.json",
  htmlFile: "archgovern/architecture.html",
  mdFile: "ARCHITECTURE.md",
  chartsMdFile: "ARCHITECTURE_CHARTS.md",
};
```

### `projectRoot`

Defaults to the config file's directory. Override it when the config lives in a
subfolder but all paths are relative to the repo root:

```js
module.exports = {
  projectRoot: "..",          // e.g. config in <root>/config/
  sourceRoots: ["packages/app/src"],
  // ...
};
```

### `derivedFacts` reference

Each fact runs `extract` over its inputs and, when the result is non-empty,
rewrites the target node's `description` via `description(items, node)`.

| Input `type` | `files` entry | `extract` receives |
| --- | --- | --- |
| `"file"` | `{ type: "file", path }` | `[{ path, content }]` |
| `"dir"` | `{ type: "dir", path, filter? }` | `[{ path, content }]` (recursive walk) |
| `"dirNames"` | `{ type: "dirNames", path }` | `[{ path }]` (immediate subdir names) |

If `extract` is omitted, a built-in extractor dedups capture-group matches of a
provided `regex`.

## How it works

```
SCAN    walk source roots, map every file → node (nodeMapping, longest match)
EDGES   parse every import (comment/string-safe, aliases, barrels, dynamic
        import(), require) → node→node edges with file:line evidence
FACTS   run derivedFacts, overlay extracted lists onto node descriptions
LINT    fail on banned terms anywhere in curated prose
BUILD   assemble nodes/edges/flows; render md, charts, json, html
AUDIT   diff old vs new; write changed files; exit 0 (clean) or 1 (drift)
```

Key rules:

- **No node without files on disk** (except external/remote nodes).
- **No edge without an import statement** (except configured implicit/remote edges).
- **`flows.js` is curated and never overwritten** — but flows referencing
  missing nodes fail the build.
- **Idempotent**: a clean second run produces zero diffs and exits 0.

## Accuracy guarantees

archgovern is deliberately stricter than a regex + `grep` pipeline. Concretely:

| Guarantee | How |
| --- | --- |
| No phantom edges from commented-out code | Import extraction and barrel re-export tracing both run on comment/string-stripped content (byte-length preserved) |
| CommonJS + ESM barrels both traced | `export * from`, `export * as ns from`, `module.exports = require(...)`, `exports.foo = require(...)` |
| Aliases can't silently go missing | `compilerOptions.paths` auto-discovered from tsconfig (local `extends` followed), including wildcard `*` substitution; explicit config aliases win |
| `module.require` / dynamic `import()` / `require` all caught | comment-safe extraction with boundary checks (`obj.require(` is not a module load) |
| Incomplete graph can fail the build | `strictUnmappedLocal` — imported local files outside `nodeMapping` fail instead of just warning |
| Renamed functions in flow prose are surfaced | `flowSymbolCheck` flags step actions calling code-like identifiers (CamelCase/snake_case, member accesses and prose words skipped) absent from the node's files (advisory) |
| Stale prose can't be committed silently | `curatedContentBans` fails the build on any banned term in node/edge/flow text |

Two honest limits: hand-written **prose truth** (a sentence that is grammatical but
factually wrong) can't be proven by any static tool — the bans + symbol check
minimize it. And exotic package `exports`-map resolution inside `node_modules`
is not modeled; bare packages not in `externalPackageMap` are reported as
advisory unmapped imports.

## CI / pre-commit

Fail your build when the architecture drifts:

```yaml
# GitHub Actions
- run: npx archgovern
```

Drift (deleted file, new import, schema change…) makes `archgovern` exit `1` —
the engine auto-corrects `data/nodes.js` / `data/edges.js` and re-renders the
docs, then a re-run exits `0`. Commit the corrected files and you're good. For
a pre-commit hook:

```bash
npx archgovern            # exits 1 on drift → blocks the commit
npx archgovern --no-write # lint-only check (fails without touching files)
```

## Example: porting a legacy governance engine

`examples/harvi/` is a real-world proof that archgovern needs **no code changes**
to reproduce another engine's output. The Harvi mobile app used a bespoke
`graphing/verify_graph.js`; `examples/harvi/archgovern.config.js` re-expresses its
entire behavior as config. `node examples/harvi/compare.js` diffs the two engines'
graphs and exits 0 when they are equivalent:

```
╔═ NODES  legacy=38  fresh=38    ✅ identical node set
╔═ EDGES  legacy=189 fresh=189   ✅ identical edge set
╔═ FLOWS  legacy=21  fresh=21    ✅ identical flow set
✅ GRAPHS ARE EQUIVALENT — archgovern reproduces the legacy engine's output.
```

## Development

```bash
npm test        # node --test "test/**/*.test.js"
```

## License

MIT
