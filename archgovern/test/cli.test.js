const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const BIN = path.join(__dirname, "..", "bin", "archgovern.js");
const FIXTURE_CONFIG = path.join(__dirname, "..", "test-fixture", "archgovern.config.js");

function run(args, opts = {}) {
  try {
    const stdout = execFileSync(process.execPath, [BIN, ...args], {
      encoding: "utf8",
      ...opts,
    });
    return { status: 0, stdout };
  } catch (err) {
    return { status: err.status ?? 1, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}

function copyFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archgovern-cli-"));
  const project = path.join(dir, "project");
  fs.cpSync(path.join(__dirname, "..", "test-fixture"), project, { recursive: true });
  return project;
}

test("no config found exits 2 with a hint", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archgovern-empty-"));
  const { status, stderr } = run([], { cwd: dir });
  assert.equal(status, 2);
  assert.match(stderr, /No archgovern config found/);
});

test("--version and --help work", () => {
  const { status, stdout } = run(["--version"]);
  assert.equal(status, 0);
  assert.match(stdout, /archgovern v\d+\.\d+\.\d+/);

  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
});

test("--init scaffolds a config file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archgovern-init-"));
  const { status, stdout } = run(["--init"], { cwd: dir });
  assert.equal(status, 0);
  assert.ok(fs.existsSync(path.join(dir, "archgovern.config.js")));
  assert.match(stdout, /Created/);
});

test("first run exits 1 (writes outputs), second run exits 0 (idempotent)", () => {
  const project = copyFixture();
  const config = path.join(project, "archgovern.config.js");

  const first = run([config]);
  assert.equal(first.status, 1, first.stdout);
  assert.match(first.stdout, /GOVERNANCE CHECK FAILED/);

  const second = run([config]);
  assert.equal(second.status, 0, second.stdout);
  assert.match(second.stdout, /GOVERNANCE CHECK PASSED/);

  // Generated artifacts exist and are unchanged after the second run.
  const json = path.join(project, "archgovern", "architecture.json");
  const md = path.join(project, "archgovern", "ARCHITECTURE.md");
  assert.ok(fs.existsSync(json));
  assert.ok(fs.existsSync(md));
  assert.ok(fs.existsSync(path.join(project, "archgovern", "architecture.html")));
  assert.ok(fs.existsSync(path.join(project, "archgovern", "ARCHITECTURE_CHARTS.md")));
  const before = fs.readFileSync(json, "utf8");
  const third = run([config]);
  assert.equal(third.status, 0, third.stdout);
  assert.equal(fs.readFileSync(json, "utf8"), before, "no rewrite on clean run");
});

test("stale code fails the build and is corrected", () => {
  const project = copyFixture();
  const config = path.join(project, "archgovern.config.js");

  // Sync first (first run writes the data files and exits 1 by design).
  const sync = run([config]);
  assert.equal(sync.status, 1, sync.stdout);

  // Delete a file that backs a single-file node -> node + its edges vanish.
  fs.unlinkSync(path.join(project, "src", "lib", "api.ts"));

  const first = run([config]);
  assert.equal(first.status, 1, first.stdout);
  assert.match(first.stdout, /GOVERNANCE CHECK FAILED/);
  assert.match(first.stdout, /❌ Removed: 1/);

  // After the engine corrects the data files, the graph is stable again.
  const second = run([config]);
  assert.equal(second.status, 0, second.stdout);
  const third = run([config]);
  assert.equal(third.status, 0, third.stdout);
});

test("--no-write never writes files", () => {
  const project = copyFixture();
  const config = path.join(project, "archgovern.config.js");
  const json = path.join(project, "archgovern", "architecture.json");
  const dataDir = path.join(project, "archgovern", "data");

  const { status } = run([config, "--no-write"]);
  assert.equal(status, 1);
  assert.ok(!fs.existsSync(json));
  assert.ok(!fs.existsSync(dataDir));
});

test("invalid config exits 2 with a message", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archgovern-badcfg-"));
  const bad = path.join(dir, "archgovern.config.js");
  fs.writeFileSync(bad, `module.exports = { sourceRoots: [] };`, "utf8");
  const { status, stderr } = run([bad]);
  assert.equal(status, 2);
  assert.match(stderr, /sourceRoots/);
});
