const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadConfig, validateConfig, deepMerge } = require("../lib/config");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "archgovern-config-"));

function writeConfig(obj) {
  const file = path.join(tmp, `config-${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(file, `module.exports = ${JSON.stringify(obj)};`, "utf8");
  return file;
}

test("loadConfig applies defaults for missing keys", () => {
  const file = writeConfig({ sourceRoots: ["src"] });
  const cfg = loadConfig(file);
  assert.equal(cfg.projectName, "Architecture");
  assert.deepEqual(cfg.sourceRoots, ["src"]);
  assert.deepEqual(cfg.nodeMapping, {});
  assert.ok(path.isAbsolute(cfg.dataDir));
  assert.ok(fs.existsSync(cfg.templateFile), "bundled template must exist");
});

test("loadConfig honors a projectRoot override relative to the config file", () => {
  const sub = path.join(tmp, "nested");
  fs.mkdirSync(sub, { recursive: true });
  const file = path.join(sub, "archgovern.config.js");
  fs.writeFileSync(
    file,
    `module.exports = { projectRoot: "..", sourceRoots: ["src"] };`,
    "utf8",
  );
  const cfg = loadConfig(file);
  assert.equal(cfg.projectRoot, tmp);
  assert.equal(cfg.dataDir, path.join(tmp, "archgovern/data"));
});

test("loadConfig accepts a function config", () => {
  const file = writeConfig({});
  const fnFile = path.join(tmp, `config-fn-${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(
    fnFile,
    `module.exports = () => ({ projectName: "From Function", sourceRoots: ["x"] });`,
    "utf8",
  );
  const cfg = loadConfig(fnFile);
  assert.equal(cfg.projectName, "From Function");
  assert.deepEqual(cfg.sourceRoots, ["x"]);
  void file;
});

test("validateConfig rejects broken nodeMapping", () => {
  assert.throws(() => validateConfig({ sourceRoots: ["src"], nodeMapping: "nope" }));
  assert.throws(() =>
    validateConfig({ sourceRoots: ["src"], nodeMapping: { bad: "not-an-array" } }),
  );
});

test("validateConfig rejects missing sourceRoots", () => {
  assert.throws(() => validateConfig({ sourceRoots: [] }));
});

test("deepMerge replaces arrays and merges objects", () => {
  const base = { a: [1, 2], b: { x: 1, y: 2 }, c: 3 };
  const merged = deepMerge(base, { a: [9], b: { y: 99 }, d: 4 });
  assert.deepEqual(merged.a, [9]);
  assert.deepEqual(merged.b, { x: 1, y: 99 });
  assert.equal(merged.c, 3);
  assert.equal(merged.d, 4);
});
