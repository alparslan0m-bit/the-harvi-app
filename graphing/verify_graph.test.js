const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runGovernance, walk } = require("./verify_graph");
const projectRoot = path.resolve(__dirname, "..");

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
