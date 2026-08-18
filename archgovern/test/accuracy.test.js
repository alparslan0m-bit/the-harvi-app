const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { runGovernance } = require("../lib/run");
const { extractImports } = require("../lib/imports");
const { discoverTsconfigAliases, tsconfigPathsToAliases, stripJsonComments } = require("../lib/tsconfig");
const { scanFlowSymbols } = require("../lib/lint");

let seq = 0;
function tmpProject() {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "archgovern-acc-")), "p");
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  return dir;
}

function makeConfig(projectRoot, overrides = {}) {
  const dataDir = path.join(projectRoot, "archgovern", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return {
    projectName: "Accuracy",
    sourceRoots: ["src"],
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
    skipDirs: ["node_modules"],
    aliases: {},
    tsconfigPaths: true,
    nodeMapping: {},
    externalPackageMap: {},
    remoteNodes: {},
    implicitEdges: [],
    remoteEdges: [],
    derivedFacts: [],
    curatedContentBans: [],
    strictUnmappedLocal: false,
    flowSymbolCheck: false,
    orderedLayers: ["presentation", "application", "infrastructure", "external"],
    layerClasses: {},
    dataDir,
    jsonFile: path.join(projectRoot, "architecture.json"),
    htmlFile: path.join(projectRoot, "architecture.html"),
    mdFile: path.join(projectRoot, "ARCHITECTURE.md"),
    chartsMdFile: path.join(projectRoot, "ARCHITECTURE_CHARTS.md"),
    templateFile: null,
    projectRoot,
    ...overrides,
  };
}

function writeFile(root, rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
}

function edgeKeys(r) {
  return r.verifiedArchEdges.map((e) => `${e.source}->${e.target}`).sort();
}

test("REG-1: barrel re-export inside a COMMENT cannot create a phantom edge", () => {
  const p = tmpProject();
  writeFile(p, "src/app/index.ts", `import { z } from "@/barrel";\nexport const v = z;\n`);
  writeFile(p, "src/barrel/index.ts", `// export * from "../lib";\nexport const z = 1;\n`);
  writeFile(p, "src/lib/util.ts", `export const x = 1;\n`);

  const cfg = makeConfig(p, {
    aliases: { "@": "" },
    nodeMapping: { app: ["src/app"], lib: ["src/lib"] },
  });
  const r = runGovernance({ projectRoot: p, config: cfg });

  assert.ok(!edgeKeys(r).includes("app->lib"), "comment re-export must be ignored");
  assert.ok(r.droppedImports.some((d) => d.reason === "resolved-unmapped"));
});

test("REG-2: CommonJS barrel re-export (module.exports = require) is traced", () => {
  const p = tmpProject();
  writeFile(p, "src/app/index.ts", `const util = require("@/barrel");\nexport default util;\n`);
  writeFile(p, "src/barrel/index.ts", `module.exports = require("../lib/util");\n`);
  writeFile(p, "src/lib/util.ts", `module.exports = { x: 1 };\n`);

  const cfg = makeConfig(p, {
    aliases: { "@": "" },
    nodeMapping: { app: ["src/app"], lib: ["src/lib"] },
  });
  const r = runGovernance({ projectRoot: p, config: cfg });

  assert.ok(edgeKeys(r).includes("app->lib"), "CommonJS re-export must create the edge");
});

test("REG-3: ESM namespace re-export (export * as ns from) is traced", () => {
  const p = tmpProject();
  writeFile(p, "src/app/index.ts", `import * as util from "@/barrel";\nexport default util;\n`);
  writeFile(p, "src/barrel/index.ts", `export * as util from "../lib/util";\n`);
  writeFile(p, "src/lib/util.ts", `export const x = 1;\n`);

  const cfg = makeConfig(p, {
    aliases: { "@": "" },
    nodeMapping: { app: ["src/app"], lib: ["src/lib"] },
  });
  const r = runGovernance({ projectRoot: p, config: cfg });

  assert.ok(edgeKeys(r).includes("app->lib"));
});

test("module.require is extracted as an import", () => {
  const imports = extractImports(`const x = module.require('./real');\nimport y from './esm';`);
  assert.deepEqual(
    imports.map((i) => i.importPath),
    ["./real", "./esm"],
  );
});

test("tsconfigPaths: paths are auto-discovered from a source-root tsconfig", () => {
  const p = tmpProject();
  writeFile(p, "tsconfig.json", `{ "compilerOptions": { "paths": { "@app/*": ["./src/app/*"] } } }`);
  writeFile(p, "src/index.ts", `import { util } from "@app/util";\nexport default util;\n`);
  writeFile(p, "src/app/util.ts", `export const util = 1;\n`);

  const cfg = makeConfig(p, {
    nodeMapping: { root: ["src/index.ts"], app: ["src/app"] },
  });
  const r = runGovernance({ projectRoot: p, config: cfg });

  assert.ok(edgeKeys(r).includes("root->app"), "tsconfig alias must resolve to the app node");
});

test("tsconfigPaths: explicit config aliases win over tsconfig paths", () => {
  const p = tmpProject();
  writeFile(p, "tsconfig.json", `{ "compilerOptions": { "paths": { "@app/*": ["./src/app/*"] } } }`);
  writeFile(p, "src/index.ts", `import { util } from "@app/util";\nexport default util;\n`);
  writeFile(p, "src/app/util.ts", `export const util = 1;\n`);
  writeFile(p, "src/lib/util.ts", `export const util = 2;\n`);

  // Explicit aliases are source-root-relative, so "lib" -> <src>/lib/util.
  const cfg = makeConfig(p, {
    aliases: { "@app": "lib" },
    nodeMapping: { root: ["src/index.ts"], app: ["src/app"], lib: ["src/lib"] },
  });
  const r = runGovernance({ projectRoot: p, config: cfg });

  assert.ok(edgeKeys(r).includes("root->lib"), "explicit alias wins");
  assert.ok(!edgeKeys(r).includes("root->app"), "tsconfig-derived alias must lose");
});

test("tsconfigPathToAliases converts wildcard + non-wildcard entries", () => {
  const p = tmpProject();
  const entries = tsconfigPathsToAliases(
    { "@/*": ["./*"], "@components/*": ["./src/ui/*"], "@app": ["./src/app"] },
    p,
    p,
  );
  assert.deepEqual(entries, [
    { prefix: "@", base: "*", anchor: "projectRoot" },
    { prefix: "@components", base: "src/ui/*", anchor: "projectRoot" },
    { prefix: "@app", base: "src/app", anchor: "projectRoot" },
  ]);
});

test("stripJsonComments parses JSONC", () => {
  const parsed = JSON.parse(stripJsonComments(`{\n  // comment\n  "a": 1 /* trailing */\n}`));
  assert.deepEqual(parsed, { a: 1 });
});

test("strictUnmappedLocal: imported local files outside the graph fail the build", () => {
  const p = tmpProject();
  writeFile(p, "src/app/index.ts", `import { helper } from "../helper";\nexport default helper;\n`);
  writeFile(p, "src/helper.ts", `export const helper = 1;\n`);

  const relaxed = makeConfig(p, { nodeMapping: { app: ["src/app"] } });
  const rRelaxed = runGovernance({ projectRoot: p, config: relaxed });
  assert.equal(rRelaxed.strictLocalFail, false, "default: advisory only");

  const strict = makeConfig(p, { nodeMapping: { app: ["src/app"] }, strictUnmappedLocal: true });
  const rStrict = runGovernance({ projectRoot: p, config: strict });
  assert.equal(rStrict.strictLocalFail, true);
  assert.equal(rStrict.hasChanges, true);
  assert.ok(rStrict.unmappedLocalImports.some((d) => d.reason === "resolved-unmapped"));
});

test("flowSymbolCheck: flags renamed symbols, ignores existing ones", () => {
  const p = tmpProject();
  writeFile(p, "src/app/index.ts", `export function renderApp() { return 1; }\n`);
  const dataDir = path.join(p, "archgovern", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  writeFile(p, "archgovern/data/flows.js", `module.exports = [
  { id: "f1", name: "F1", description: "d", steps: [
    { order: 1, node: "app", action: "renderApp() then legacyRenamed()" },
    { order: 2, node: "app", action: "renderApp()" },
  ]},
];`);

  const cfg = makeConfig(p, {
    nodeMapping: { app: ["src/app"] },
    flowSymbolCheck: true,
  });
  const r = runGovernance({ projectRoot: p, config: cfg });

  assert.equal(r.flowWarnings.length, 0);
  assert.equal(r.flowSymbolWarnings.length, 1, "only the missing symbol is flagged");
  assert.equal(r.flowSymbolWarnings[0].symbol, "legacyRenamed");

  // Advisory: after a first write (data files exist), a build with warnings
  // still passes — flow symbol drift never fails the build.
  const { writeOutputs } = require("../lib/write");
  writeOutputs(r, cfg);
  const r2 = runGovernance({ projectRoot: p, config: cfg });
  assert.equal(r2.flowSymbolWarnings.length, 1);
  assert.equal(r2.hasChanges, false, "advisory: never fails the build");

  const off = makeConfig(p, { nodeMapping: { app: ["src/app"] }, flowSymbolCheck: false });
  const rOff = runGovernance({ projectRoot: p, config: off });
  assert.equal(rOff.flowSymbolWarnings.length, 0);
});

test("discoverTsconfigAliases: disabled, auto, and explicit path", () => {
  const p = tmpProject();
  writeFile(p, "tsconfig.json", `{ "compilerOptions": { "paths": { "@x/*": ["./src/x/*"] } } }`);
  assert.deepEqual(discoverTsconfigAliases({ projectRoot: p, sourceRoots: ["src"], tsconfigPaths: true }), [
    { prefix: "@x", base: "src/x/*", anchor: "projectRoot" },
  ]);
  assert.deepEqual(discoverTsconfigAliases({ projectRoot: p, sourceRoots: ["src"], tsconfigPaths: false }), []);
  assert.deepEqual(discoverTsconfigAliases({ projectRoot: p, sourceRoots: ["src"], tsconfigPaths: "tsconfig.json" }), [
    { prefix: "@x", base: "src/x/*", anchor: "projectRoot" },
  ]);
});

test("tsconfig extends chain is followed for local files", () => {
  const p = tmpProject();
  writeFile(p, "tsconfig.json", `{ "extends": "./tsconfig.base.json" }`);
  writeFile(p, "tsconfig.base.json", `{ "compilerOptions": { "paths": { "@base/*": ["./src/*"] } } }`);
  assert.deepEqual(
    discoverTsconfigAliases({ projectRoot: p, sourceRoots: ["src"], tsconfigPaths: true }),
    [{ prefix: "@base", base: "src/*", anchor: "projectRoot" }],
  );
});
