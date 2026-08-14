const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runGovernance, walk, stripCommentsAndStrings, extractImports, renderReport, detectRemoteUsage, computeExitCode, writeOutputs } = require("./verify_graph");
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
    /flows\.js references missing nodes — this file is curated and must be fixed by hand/,
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
