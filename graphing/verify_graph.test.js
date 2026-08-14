const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runGovernance, walk, stripCommentsAndStrings, extractImports, renderReport } = require("./verify_graph");
const projectRoot = path.resolve(__dirname, "..");

// makeFixtureTree(layout) -> root (tmp dir); caller runs rmSync in t.after().
function makeFixtureTree(layout) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vg-drop-"));
  for (const [rel, content] of Object.entries(layout)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  // Never let a temp data dir populate require.cache across tests.
  delete require.cache[path.resolve(path.join(root, "data", "nodes.js"))];
  delete require.cache[path.resolve(path.join(root, "data", "edges.js"))];
  return root;
}

// Fixture-scoped governance: nodeMapping patterns must be relative to the
// fixture projectRoot (they are compared against path.relative(projectRoot, file)).
function runFixtureGovernance(root, nodeMapping) {
  return runGovernance({
    projectRoot: root,
    mobileRoot: path.join(root, "app"),
    supabaseFunctionsDir: path.join(root, "supabase", "functions"),
    dataDir: path.join(root, "data"),
    config: { ...require("./config"), nodeMapping },
  });
}

const SRC = `
// from './fake'
/* import x from './fake2' */
import a from './realA';
import './realB';
const c = require('./realC');
const d = import('./realD');
const msg = "import './inString'";
`;

test("extractImports ignores comments and strings", () => {
  const got = extractImports(SRC).map((i) => i.importPath);
  assert.deepStrictEqual(got, ["./realA", "./realB", "./realC", "./realD"]);
});

test("stripCommentsAndStrings preserves length and line positions", () => {
  const out = stripCommentsAndStrings(SRC);
  assert.strictEqual(out.length, SRC.length);
  assert.strictEqual(out.split("\n").length, SRC.split("\n").length);
});

test("refactor preserves committed architecture.json byte-for-byte", async (t) => {
  const result = runGovernance({
    projectRoot,
    mobileRoot: path.join(projectRoot, "artifacts", "mobile"),
    supabaseFunctionsDir: path.join(projectRoot, "supabase", "functions"),
    dataDir: path.join(__dirname, "data"),
    config: require("./config"),
  });
  const committed = require(path.join(__dirname, "architecture.json"));
  assert.deepStrictEqual(JSON.parse(result.jsonString), committed);
});

test("walk finds .ts/.tsx files and skips node_modules/.expo", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vg-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(path.join(root, "src", "components"), { recursive: true });
  fs.mkdirSync(path.join(root, "node_modules", "pkg"), { recursive: true });
  fs.mkdirSync(path.join(root, ".expo"), { recursive: true });

  fs.writeFileSync(path.join(root, "src", "a.ts"), "export {};\n");
  fs.writeFileSync(
    path.join(root, "src", "components", "b.tsx"),
    "export {};\n",
  );
  fs.writeFileSync(path.join(root, "src", "c.js"), "module.exports = {};\n");
  fs.writeFileSync(path.join(root, "node_modules", "pkg", "x.ts"), "export {};\n");
  fs.writeFileSync(path.join(root, ".expo", "y.ts"), "export {};\n");

  const rel = walk(root)
    .map((f) => path.relative(root, f).replace(/\\/g, "/"))
    .sort();

  assert.deepStrictEqual(rel, ["src/a.ts", "src/components/b.tsx"]);
});

test("import to unmapped file is reported as resolved-unmapped", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `import x from '../src/helper';`,
    "src/helper.ts": `export const x = 1;`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, { app: ["app/_layout.tsx"] });
  const drop = result.droppedImports.find((d) => d.reason === "resolved-unmapped");
  assert.ok(drop, "dropped import must be recorded");
  assert.strictEqual(drop.fromNode, "app");
  assert.ok(
    drop.targetPath.endsWith(path.join("src", "helper.ts")),
    `targetPath must be the resolved absolute path, got ${drop.targetPath}`,
  );
  assert.strictEqual(drop.files[0].importPath, "../src/helper");
  assert.strictEqual(drop.files[0].lineNum, 1);
});

test("unknown bare package import is reported as external-unmapped", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `import { x } from 'some-unknown-pkg';`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, { app: ["app/_layout.tsx"] });
  const drop = result.droppedImports.find((d) => d.reason === "external-unmapped");
  assert.ok(drop, "dropped import must be recorded");
  assert.strictEqual(drop.fromNode, "app");
  assert.strictEqual(drop.targetPath, "some-unknown-pkg");
});

test("import to missing file is reported as unresolvable", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `import m from './missing';`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, { app: ["app/_layout.tsx"] });
  const drop = result.droppedImports.find((d) => d.reason === "unresolvable");
  assert.ok(drop, "dropped import must be recorded");
  assert.ok(
    drop.targetPath.endsWith(path.join("app", "missing")),
    `targetPath must be the attempted resolved path, got ${drop.targetPath}`,
  );
});

test("renderReport shows unmapped imports and caps samples at 5", () => {
  const droppedImports = Array.from({ length: 7 }, (_, i) => ({
    fromNode: `node_${i % 3}`,
    targetPath: `some/pkg${i}`,
    reason: "external-unmapped",
    files: [{ file: `app/f${i}.tsx`, lineNum: 1, importPath: `pkg${i}` }],
  }));
  const report = renderReport({
    ...emptyRenderResult(),
    droppedImports,
  });
  assert.match(report, /⚠️ UNMAPPED IMPORTS: 7 \(advisory\)/);
  const sampleCount = (report.match(/some\/pkg\d/gu) || []).length;
  assert.strictEqual(sampleCount, 5, "non-verbose report lists at most 5 samples");
});

test("renderReport prints the full unmapped list when verbose", () => {
  const droppedImports = Array.from({ length: 7 }, (_, i) => ({
    fromNode: `node_${i % 3}`,
    targetPath: `some/pkg${i}`,
    reason: "external-unmapped",
    files: [{ file: `app/f${i}.tsx`, lineNum: 1, importPath: `pkg${i}` }],
  }));
  const report = renderReport({
    ...emptyRenderResult(),
    verbose: true,
    droppedImports,
  });
  const sampleCount = (report.match(/some\/pkg\d/gu) || []).length;
  assert.strictEqual(sampleCount, 7, "verbose report lists every unmapped import");
});

function emptyRenderResult() {
  return {
    stalePatterns: [],
    existingNodes: [],
    allNodeIds: new Set(),
    nodeToFiles: new Map(),
    addedNodes: [],
    removedNodes: [],
    existingEdges: [],
    verifiedArchEdges: [],
    addedEdges: [],
    removedEdges: [],
    existingFlowTriggerEdges: [],
    verifiedFlowEdges: [],
    flowWarnings: [],
    hasChanges: false,
    nodesChanged: false,
    edgesChanged: false,
  };
}
