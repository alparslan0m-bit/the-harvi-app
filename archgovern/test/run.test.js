const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadConfig } = require("../lib/config");
const { runGovernance } = require("../lib/run");

const FIXTURE = path.join(__dirname, "..", "test-fixture", "archgovern.config.js");

function runFixture(extraFiles = {}) {
  const cfg = loadConfig(FIXTURE);
  return runGovernance({ projectRoot: cfg.projectRoot, config: cfg });
}

test("fixture graph: expected nodes and edges", () => {
  const r = runFixture();
  assert.equal(r.allNodeIds.size, 7);
  for (const id of ["app", "lib", "store", "remote", "react", "zustand", "backend_api"]) {
    assert.ok(r.allNodeIds.has(id), `missing node ${id}`);
  }

  const archEdgeKeys = r.verifiedArchEdges.map((e) => `${e.source}->${e.target}`).sort();
  assert.deepEqual(archEdgeKeys, [
    "app->backend_api",
    "app->lib",
    "app->react",
    "app->remote",
    "app->store",
    "lib->store",
    "remote->backend_api",
    "store->zustand",
  ]);
});

test("fixture graph: derived fact applied to lib description", () => {
  const r = runFixture();
  const lib = r.verifiedNodes.find((n) => n.id === "lib");
  assert.equal(lib.description, "API layer. Endpoints: GET /data, POST /submit");
});

test("fixture graph: external + remote nodes have no path", () => {
  const r = runFixture();
  const react = r.verifiedNodes.find((n) => n.id === "react");
  const backend = r.verifiedNodes.find((n) => n.id === "backend_api");
  assert.equal(react.path, undefined);
  assert.equal(backend.path, undefined);
  const app = r.verifiedNodes.find((n) => n.id === "app");
  assert.equal(app.path, "src/app");
});

test("advisory unmapped imports are surfaced but never fail the build", () => {
  // Run the CLI once against a temp copy so the data files exist on disk,
  // then assert a synced graph has no changes despite unmapped imports.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archgovern-advisory-"));
  const project = path.join(dir, "project");
  fs.cpSync(path.join(__dirname, "..", "test-fixture"), project, { recursive: true });

  const { spawnSync } = require("node:child_process");
  const bin = path.join(__dirname, "..", "bin", "archgovern.js");
  // First run writes the data files and exits 1 by design (data was corrected).
  const first = spawnSync(process.execPath, [bin, path.join(project, "archgovern.config.js")], {
    encoding: "utf8",
  });
  assert.equal(first.status, 1);

  const cfg = loadConfig(path.join(project, "archgovern.config.js"));
  const r = runGovernance({ projectRoot: project, config: cfg });
  assert.ok(r.droppedImports.length >= 2, "advisory imports are reported");
  assert.equal(r.hasChanges, false, "advisory imports never fail a synced build");
});

test("runGovernance is pure: repeated calls with identical data are stable", () => {
  const a = runFixture();
  const b = runFixture();
  assert.equal(a.jsonString, b.jsonString);
  assert.equal(a.mdString, b.mdString);
});

test("flows referencing a missing node produce flowWarnings", () => {
  const cfg = loadConfig(FIXTURE);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archgovern-flow-"));

  const project = path.join(dir, "project");
  fs.cpSync(path.join(__dirname, "..", "test-fixture"), project, { recursive: true });
  const dataDir = path.join(project, "archgovern", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "flows.js"),
    `module.exports = [
  {
    id: "bad-flow",
    name: "Bad Flow",
    description: "references a node that does not exist",
    steps: [{ order: 1, node: "ghost_node", action: "does something" }],
  },
];`,
    "utf8",
  );

  // Point the loaded config at the temp copy so runGovernance scans it.
  cfg.projectRoot = project;
  cfg.dataDir = dataDir;

  const r = runGovernance({ projectRoot: project, config: cfg });
  assert.equal(r.flowWarnings.length, 1);
  assert.equal(r.flowWarnings[0].missingNode, "ghost_node");
  assert.equal(r.hasChanges, true);
});

test("curated content bans flag stale prose", () => {
  const cfg = loadConfig(FIXTURE);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archgovern-ban-"));

  const project = path.join(dir, "project");
  fs.cpSync(path.join(__dirname, "..", "test-fixture"), project, { recursive: true });
  const dataDir = path.join(project, "archgovern", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "nodes.js"),
    `module.exports = [{ id: "app", label: "App", layer: "presentation", description: "uses legacyApi cache" }];`,
    "utf8",
  );

  cfg.projectRoot = project;
  cfg.dataDir = dataDir;

  const r = runGovernance({ projectRoot: project, config: cfg });
  assert.equal(r.contentViolations.length, 1);
  assert.equal(r.contentViolations[0].phrase, "legacyApi");
  assert.equal(r.hasChanges, true);
});
