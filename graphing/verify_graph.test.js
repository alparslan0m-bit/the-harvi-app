const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runGovernance, walk, stripCommentsAndStrings, extractImports, renderReport, detectRemoteUsage, computeExitCode, writeOutputs, renderArchitectureMd, renderChartsMd, resolveImportToNode, extractSqliteTables, extractSupabaseDbFacts, scanCuratedContent, applyDerivedDescriptions } = require("./verify_graph");
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

test("extractImports reports 1-based line numbers on original content", () => {
  assert.deepStrictEqual(
    extractImports(SRC).map((i) => i.lineNum),
    [4, 5, 6, 7],
  );
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

test("non-client node directly using supabase.from() gets a DB edge with line evidence", async (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `// app`,
    "app/features/access/service.ts": `import { supabase } from '../../shared/services/supabase';
export const go = () => supabase.from('t').select('*');`,
    "app/shared/services/supabase.ts": `export const supabase = { from: (t) => ({ select: () => {} }) };`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, {
    app: ["app/_layout.tsx"],
    access_service: ["app/features/access"],
    supabase_client: ["app/shared/services/supabase.ts"],
  });
  const key = "access_service->supabase_db";
  const evidence = result.edgeEvidence.get(key);
  assert.ok(evidence, key + " must exist");
  assert.ok(evidence[0].lineNum >= 1, "evidence must carry a real line number");
  assert.match(evidence[0].snippet, /supabase\.from/);

  // Audit regression (Finding 3): exactly ONE directed remote edge from this
  // node, and no phantom client->functions attribution.
  const REMOTES = new Set(["supabase_auth", "supabase_db", "supabase_functions"]);
  const remoteEdges = result.verifiedArchEdges.filter(
    (e) => e.source === "access_service" && REMOTES.has(e.target),
  );
  assert.strictEqual(remoteEdges.length, 1, "exactly one remote edge from access_service");
  assert.strictEqual(remoteEdges[0].target, "supabase_db");
  assert.ok(
    !result.edgeEvidence.has("supabase_client->supabase_functions"),
    "no phantom supabase_client->supabase_functions edge",
  );
});

test("supabase_client with createClient yields implicit auth and db edges", async (t) => {
  const root = makeFixtureTree({
    "app/shared/services/supabase.ts": `import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(url, anonKey, { auth: { autoRefreshToken: true } });`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, {
    supabase_client: ["app/shared/services/supabase.ts"],
  });
  for (const remote of ["supabase_auth", "supabase_db"]) {
    const key = `supabase_client->${remote}`;
    const evidence = result.edgeEvidence.get(key);
    assert.ok(evidence, key + " must exist");
    assert.ok(evidence[0].lineNum >= 1, "evidence must carry a real line number");
    assert.match(evidence[0].snippet, /createClient/);
  }
});

test("functions.invoke in a non-client node yields fromNode->supabase_functions, not supabase_client->supabase_functions", async (t) => {
  const root = makeFixtureTree({
    "app/features/quiz/service.ts": `import { supabase } from '../../shared/services/supabase';
export const ping = () => supabase.functions.invoke('hello-world');`,
    "app/shared/services/supabase.ts": `import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(url, anonKey);`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, {
    quiz_feature: ["app/features/quiz"],
    supabase_client: ["app/shared/services/supabase.ts"],
  });
  const key = "quiz_feature->supabase_functions";
  const evidence = result.edgeEvidence.get(key);
  assert.ok(evidence, key + " must exist");
  assert.match(evidence[0].snippet, /functions\.invoke/);
  assert.ok(
    !result.edgeEvidence.has("supabase_client->supabase_functions"),
    "wrongly-attributed supabase_client->supabase_functions must not exist",
  );
});

test("detectRemoteUsage reports remoteId, lineNum and snippet for first match", () => {
  const content = `const x = 1;
supabase.from('users').select('*');
supabase.auth.getSession();
`;
  const remoteNodes = {
    supabase_auth: { patterns: [/supabase\.auth\./] },
    supabase_db: { patterns: [/supabase\.rpc\(/, /supabase\.from\(/] },
    supabase_functions: { patterns: [/supabase\.functions\.invoke\(/] },
  };
  const usage = detectRemoteUsage(content, remoteNodes);
  assert.deepStrictEqual(usage.map((u) => u.remoteId).sort(), ["supabase_auth", "supabase_db"]);
  const db = usage.find((u) => u.remoteId === "supabase_db");
  assert.strictEqual(db.lineNum, 2);
  assert.match(db.snippet, /supabase\.from/);
  const auth = usage.find((u) => u.remoteId === "supabase_auth");
  assert.strictEqual(auth.lineNum, 3);
  assert.match(auth.snippet, /supabase\.auth\.getSession/);
});

// Node metadata is pre-placed at the exact bytes the engine generates, so the
// fixture has zero node/edge/pattern deltas and `hasChanges` on the ghost flow
// is attributable solely to flowWarnings.
const STABLE_NODES_JS = [
  `module.exports = [`,
  `  {`,
  `    "id": "app",`,
  `    "label": "App",`,
  `    "type": "component",`,
  `    "layer": "app",`,
  `    "description": "app"`,
  `  }`,
  `];`,
  ``,
].join("\n");

test("flow referencing a missing node is reported and forces governance to fail", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `// app`,
    "data/nodes.js": STABLE_NODES_JS,
    "data/edges.js": `module.exports = [];\n`,
    "data/flows.js": `module.exports = [{ id: "f1", name: "Ghost Flow", steps: [{ order: 1, node: "ghost", action: "x" }] }];`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, { app: ["app/_layout.tsx"] });
  assert.ok(result.flowWarnings.length > 0, "flowWarnings must surface the missing node");
  assert.strictEqual(result.flowWarnings[0].missingNode, "ghost");
  assert.strictEqual(result.flowWarnings[0].flowName, "Ghost Flow");
  assert.strictEqual(result.hasChanges, true, "hasChanges must fail on a flow warning");

  const report = renderReport(result);
  assert.match(report, /GOVERNANCE CHECK FAILED/);
  assert.match(
    report,
    /flows\.js is curated: fix the node references by hand/,
  );
});

test("computeExitCode folds changedPaths into the governance verdict", () => {
  assert.strictEqual(computeExitCode({ hasChanges: false }, ["a"]), true);
  assert.strictEqual(computeExitCode({ hasChanges: true }, []), true);
  assert.strictEqual(computeExitCode({ hasChanges: false }, []), false);
});

test("writeOutputs reports changedPaths on first write and none on identical re-write", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `// app`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dataDir = path.join(root, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const result = runFixtureGovernance(root, { app: ["app/_layout.tsx"] });
  const paths = {
    nodesPath: path.join(dataDir, "nodes.js"),
    edgesPath: path.join(dataDir, "edges.js"),
    jsonPath: path.join(root, "architecture.json"),
    htmlPath: path.join(root, "architecture.html"),
    mdPath: path.join(root, "ARCHITECTURE.md"),
    chartsMdPath: path.join(root, "ARCHITECTURE_CHARTS.md"),
  };

  const first = writeOutputs(result, paths);
  for (const expected of [
    paths.nodesPath,
    paths.edgesPath,
    paths.jsonPath,
    paths.mdPath,
    paths.chartsMdPath,
  ]) {
    assert.ok(
      first.changedPaths.includes(expected),
      `${expected} must be reported as changed on first write`,
    );
  }

  const second = writeOutputs(result, paths);
  assert.deepStrictEqual(second.changedPaths, [], "identical re-write must report no changes");

  fs.writeFileSync(paths.mdPath, "# Drifted\n");
  const third = writeOutputs(result, paths);
  assert.deepStrictEqual(
    third.changedPaths,
    [paths.mdPath],
    "drifted ARCHITECTURE.md must be detected and rewritten",
  );
});

test("stale metadata path for local node is corrected and reported", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `// app`,
    "app/features/learn/service.ts": `export const x = 1;`,
    "data/nodes.js": `module.exports = [
      { id: "learn_feature", label: "Learn", type: "service", layer: "application", path: "artifacts/mobile/src/old/learn/path", description: "Learn" }
    ];`,
    "data/edges.js": `module.exports = [];\n`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, {
    learn_feature: ["app/features/learn"],
  });
  assert.strictEqual(result.staleMetadataPaths.length, 1, "must report 1 stale metadata path");
  assert.strictEqual(result.staleMetadataPaths[0].nodeId, "learn_feature");
  assert.strictEqual(result.staleMetadataPaths[0].curatedPath, "artifacts/mobile/src/old/learn/path");
  assert.strictEqual(result.staleMetadataPaths[0].derivedPath, "app/features/learn");
  assert.strictEqual(result.hasChanges, true, "hasChanges must be true when metadata path is stale");
  const node = result.verifiedNodes.find((n) => n.id === "learn_feature");
  assert.strictEqual(node.path, "app/features/learn", "node path must be updated to derived path");
});

test("renderArchitectureMd and renderChartsMd order known layers and bucket unknowns last", () => {
  const nodes = [
    { id: "core", label: "Core", type: "component", layer: "application", description: "core" },
    { id: "db", label: "DB", type: "database", layer: "external", description: "db" },
    { id: "app", label: "App", type: "component", layer: "presentation", description: "app" },
    { id: "infra", label: "Infra", type: "cache", layer: "infrastructure", description: "infra" },
    { id: "ghost", label: "Ghost", type: "unknown", layer: "unknown", description: "ghost" },
  ];
  const flows = [];
  const orderedLayers = ["presentation", "application", "infrastructure", "external"];
  const layerClasses = {
    presentation: "fill:#f9f",
    application: "fill:#bbf",
    infrastructure: "fill:#bfb",
    external: "fill:#fbb",
    unknown: "fill:#666,stroke:#999,stroke-width:1px,stroke-dasharray: 5 5",
  };

  const md = renderArchitectureMd(nodes, flows, orderedLayers);
  assert.match(md, /### PRESENTATION LAYER/);
  assert.match(md, /### OTHER LAYER/);
  const layerOrder = [
    "### PRESENTATION LAYER",
    "### APPLICATION LAYER",
    "### INFRASTRUCTURE LAYER",
    "### EXTERNAL LAYER",
    "### OTHER LAYER",
  ];
  const positions = layerOrder.map((h) => md.indexOf(h));
  assert.ok(positions.every((p) => p !== -1), "all layer headings present: " + positions);
  assert.ok(
    positions.every((p, i) => i === 0 || p > positions[i - 1]),
    "known layers in order, unknown bucket last: " + positions,
  );

  const chartsMd = renderChartsMd(nodes, [], orderedLayers, layerClasses);
  assert.match(chartsMd, /classDef unknown/);
  assert.match(chartsMd, /subgraph MISC/);
  assert.match(chartsMd, /ghost\["Ghost"\]:::unknown/);
  const subgraphOrder = [
    "subgraph PRESENTATION",
    "subgraph APPLICATION",
    "subgraph INFRASTRUCTURE",
    "subgraph EXTERNAL",
    "subgraph MISC",
  ];
  const cPositions = subgraphOrder.map((h) => chartsMd.indexOf(h));
  assert.ok(cPositions.every((p) => p !== -1), "all subgraphs present: " + cPositions);
  assert.ok(
    cPositions.every((p, i) => i === 0 || p > cPositions[i - 1]),
    "subgraphs in layer order with MISC last: " + cPositions,
  );
});

test("writeOutputs does not touch files when content is identical (mtime preserved)", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `// app`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dataDir = path.join(root, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const result = runFixtureGovernance(root, { app: ["app/_layout.tsx"] });
  const paths = {
    nodesPath: path.join(dataDir, "nodes.js"),
    edgesPath: path.join(dataDir, "edges.js"),
    jsonPath: path.join(root, "architecture.json"),
    htmlPath: path.join(root, "architecture.html"),
    mdPath: path.join(root, "ARCHITECTURE.md"),
    chartsMdPath: path.join(root, "ARCHITECTURE_CHARTS.md"),
  };

  // First write
  writeOutputs(result, paths);
  const mtimeBefore = fs.statSync(paths.nodesPath).mtimeMs;

  // Delay so mtime would differ if file were re-written
  const start = Date.now();
  while (Date.now() - start < 50) { /* spin */ }

  // Second write — identical content
  const { changedPaths } = writeOutputs(result, paths);
  const mtimeAfter = fs.statSync(paths.nodesPath).mtimeMs;

  assert.deepStrictEqual(changedPaths, [], "changedPaths must be empty");
  assert.strictEqual(mtimeAfter, mtimeBefore, "mtime must not change when content is identical");
});

test("barrel cycle does not crash — returns resolved-unmapped", (t) => {
  const root = makeFixtureTree({
    "app/a/index.ts": `export { something } from '../b';\n`,
    "app/b/index.ts": `export { something } from '../a';\n`,
    "app/consumer.tsx": `import { something } from './a';\n`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const fileToNode = new Map();
  fileToNode.set(path.join(root, "app", "consumer.tsx"), "consumer");

  const opts = {
    projectRoot: root,
    externalPackageMap: {},
    fileToNode,
    classifyFile: () => null,
    discoveredExternals: new Set(),
  };

  // Must not throw (stack overflow) — should return gracefully
  const result = resolveImportToNode("./a", path.join(root, "app", "consumer.tsx"), opts);
  assert.strictEqual(result.nodeId, null, "cycle must resolve to null, not crash");
  assert.ok(
    result.reason === "resolved-unmapped" || result.reason === "unresolvable",
    `must report a reason, got: ${result.reason}`,
  );
});

test("commented-out barrel re-export cannot create a phantom edge", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `import { z } from './barrel';\nexport const v = z;`,
    "app/barrel/index.ts": `// export * from '../lib';\nexport const z = 1;`,
    "app/lib/index.ts": `export const x = 1;`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, {
    app: ["app/_layout.tsx"],
    lib: ["app/lib"],
  });
  const edges = result.verifiedArchEdges.map((e) => `${e.source}->${e.target}`);
  assert.ok(!edges.includes("app->lib"), "commented re-export must not create app->lib");
  const drop = result.droppedImports.find((d) => d.reason === "resolved-unmapped");
  assert.ok(drop, "barrel must be reported as an unmapped local file");
});

test("barrel with multiple re-exports traces the first one (non-greedy)", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `import { a } from './barrel';\nexport default a;`,
    "app/barrel/index.ts": `export { a } from '../liba';\nexport { b } from '../libb';`,
    "app/liba/index.ts": `export const a = 1;`,
    "app/libb/index.ts": `export const b = 1;`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, {
    app: ["app/_layout.tsx"],
    liba: ["app/liba"],
    libb: ["app/libb"],
  });
  const edges = result.verifiedArchEdges.map((e) => `${e.source}->${e.target}`);
  assert.ok(edges.includes("app->liba"), "first re-export must be traced, not the last");
});

test("module.require is extracted exactly once; .js files resolve as resolved-unmapped", (t) => {
  const imports = extractImports(
    `const x = module.require('./m1');\nconst y = require('./m2');`,
  );
  assert.deepStrictEqual(
    imports.map((i) => i.importPath),
    ["./m1", "./m2"],
    "module.require and require each extracted exactly once",
  );

  const root = makeFixtureTree({
    "app/_layout.tsx": `import h from './helper';`,
    "app/helper.js": `module.exports = { x: 1 };`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, { app: ["app/_layout.tsx"] });
  const drop = result.droppedImports.find((d) => d.reason === "resolved-unmapped");
  assert.ok(drop, "imported .js file must classify as resolved-unmapped, not unresolvable");
  assert.ok(drop.targetPath.endsWith(path.join("app", "helper.js")));
});

test("renderChartsMd emits Mermaid edge arrows for arch edges", () => {
  const nodes = [
    { id: "a", label: "A", type: "component", layer: "presentation", description: "a" },
    { id: "b", label: "B", type: "service", layer: "application", description: "b" },
  ];
  const edges = [
    { id: "e1", source: "a", target: "b", type: "calls", label: "calls" },
  ];
  const orderedLayers = ["presentation", "application"];
  const layerClasses = {
    presentation: "fill:#f9f",
    application: "fill:#bbf",
  };

  const chartsMd = renderChartsMd(nodes, edges, orderedLayers, layerClasses);
  assert.match(chartsMd, /a --> b/, "must contain the edge arrow a --> b");
});

test("extractSqliteTables parses table names from a Drizzle schema", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vg-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const schemaPath = path.join(root, "schema.ts");
  fs.writeFileSync(
    schemaPath,
    `export const users = sqliteTable("users", { id: text("id") });
export const posts = sqliteTable("posts", { id: text("id") });\n`,
  );
  assert.deepStrictEqual(extractSqliteTables(schemaPath), ["users", "posts"]);
});

test("extractSupabaseDbFacts parses tables and functions from SQL migrations", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vg-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(root, "0001.sql"),
    `CREATE TABLE IF NOT EXISTS public.years (id uuid);
CREATE OR REPLACE FUNCTION public.get_user_streak(u uuid) RETURNS int LANGUAGE plpgsql AS $$ BEGIN RETURN 1; END $$;
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats() RETURNS json LANGUAGE plpgsql AS $$ BEGIN RETURN '{}'; END $$;`,
  );
  fs.writeFileSync(
    path.join(root, "0002.sql"),
    `CREATE TABLE IF NOT EXISTS public.access_codes (id uuid);
CREATE OR REPLACE FUNCTION public.redeem_access_code(p TEXT) RETURNS json LANGUAGE plpgsql AS $$ BEGIN RETURN '{}'; END $$;`,
  );
  const { tables, rpcs } = extractSupabaseDbFacts(root);
  assert.deepStrictEqual(tables, ["years", "access_codes"]);
  assert.deepStrictEqual(rpcs, [
    "get_user_streak",
    "get_admin_dashboard_stats",
    "redeem_access_code",
  ]);
});

test("scanCuratedContent flags banned phrases across nodes, edges, and flows", () => {
  const bans = [{ phrase: "statsCache", reason: "gone" }];
  const nodes = [{ id: "cache_store", description: "holds statsCache" }];
  const edges = [
    { source: "a", target: "b", label: "calls", description: "uses statsCache" },
  ];
  const flows = [
    {
      id: "f1",
      name: "statsCache flow",
      description: "ok",
      steps: [{ order: 1, node: "a", action: "reads statsCache" }],
    },
  ];
  const v = scanCuratedContent({ nodes, edges, flows, bans });
  assert.strictEqual(v.length, 4, "one violation per offending field");
  assert.ok(v.some((x) => x.kind === "node.description" && x.target === "cache_store"));
  assert.ok(v.some((x) => x.kind === "edge.description" && x.target === "a->b"));
  assert.ok(v.some((x) => x.kind === "flow.name" && x.target === "f1"));
  assert.ok(v.some((x) => x.kind === "flow.step" && x.target === "f1:1"));
});

test("applyDerivedDescriptions overlays derived tables/RPCs/functions and leaves others untouched", () => {
  const nodes = [
    { id: "sqlite", description: "old" },
    { id: "supabase_db", description: "old" },
    { id: "supabase_functions", description: "old" },
    { id: "cache_store", description: "untouched" },
  ];
  const facts = {
    sqliteTables: ["users", "posts"],
    supabaseDb: { tables: ["years"], rpcs: ["get_user_streak"] },
    supabaseFunctions: ["record-iap"],
  };
  const byId = Object.fromEntries(
    applyDerivedDescriptions(nodes, facts).map((n) => [n.id, n.description]),
  );
  assert.match(byId.sqlite, /Tables: users, posts/);
  assert.match(byId.supabase_db, /Tables: years/);
  assert.match(byId.supabase_db, /RPCs\/functions: get_user_streak/);
  assert.match(byId.supabase_functions, /Functions: record-iap/);
  assert.strictEqual(byId.cache_store, "untouched");
});

test("applyDerivedDescriptions falls back to stored description when facts are missing", () => {
  const nodes = [{ id: "sqlite", description: "fallback prose" }];
  const facts = { sqliteTables: [], supabaseDb: { tables: [], rpcs: [] }, supabaseFunctions: [] };
  const out = applyDerivedDescriptions(nodes, facts);
  assert.strictEqual(out[0].description, "fallback prose");
});

test("curated content containing a banned stale term fails governance", (t) => {
  const root = makeFixtureTree({
    "app/_layout.tsx": `// app`,
    "data/nodes.js": `module.exports = [
      { id: "app", label: "App", type: "component", layer: "presentation", description: "uses statsCache which is gone" }
    ];`,
    "data/edges.js": `module.exports = [];\n`,
    "data/flows.js": `module.exports = [];\n`,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = runFixtureGovernance(root, { app: ["app/_layout.tsx"] });
  assert.ok(result.contentViolations.length > 0, "must detect the banned term");
  assert.strictEqual(result.contentViolations[0].phrase, "statsCache");
  assert.strictEqual(result.hasChanges, true, "hasChanges must fail on a content violation");

  const report = renderReport(result);
  assert.match(report, /CURATED CONTENT VIOLATIONS/);
  assert.match(report, /statsCache/);
  assert.match(report, /GOVERNANCE CHECK FAILED/);
});

test("real repo: derived facts match code, curated prose is clean, and state is idempotent", async (t) => {
  const result = runGovernance({
    projectRoot,
    mobileRoot: path.join(projectRoot, "artifacts", "mobile"),
    supabaseFunctionsDir: path.join(projectRoot, "supabase", "functions"),
    dataDir: path.join(__dirname, "data"),
    config: require("./config"),
  });

  assert.deepStrictEqual(
    result.contentViolations,
    [],
    "no stale terms may appear in curated prose",
  );

  const sqlite = result.verifiedNodes.find((n) => n.id === "sqlite");
  assert.ok(
    sqlite.description.includes("bookmarks"),
    "sqlite description must include the bookmarks table",
  );
  const db = result.verifiedNodes.find((n) => n.id === "supabase_db");
  assert.ok(
    db.description.includes("access_codes"),
    "supabase_db must include the access_codes table",
  );
  assert.ok(
    db.description.includes("get_user_stats_overview"),
    "supabase_db must include the stats overview RPC",
  );

  assert.strictEqual(
    result.hasChanges,
    false,
    "committed data files must match regenerated output (idempotent)",
  );
});
