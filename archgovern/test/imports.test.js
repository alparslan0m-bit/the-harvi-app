const test = require("node:test");
const assert = require("node:assert/strict");

const { stripCommentsAndStrings, extractImports } = require("../lib/imports");

test("stripCommentsAndStrings keeps byte length", () => {
  const src = "// line comment\nconst a = 'x'; /* block */ const b = 1;\n";
  const out = stripCommentsAndStrings(src);
  assert.equal(out.length, src.length);
  assert.ok(!out.includes("line comment"));
  assert.ok(!out.includes("'x'"));
  assert.ok(!out.includes("block"));
});

test("stripCommentsAndStrings preserves newlines", () => {
  const src = "a\nb\nc";
  const out = stripCommentsAndStrings(src);
  assert.equal(out.split("\n").length, 3);
});

test("extractImports ignores comments and plain strings", () => {
  const src = [
    '// import "from-comment"',
    'const s = "from not-an-import";',
    "import { a } from './real'",
    "/* from still-comment */",
    "const b = require('./real2')",
    "import('./dynamic')",
  ].join("\n");
  const imports = extractImports(src);
  assert.deepEqual(
    imports.map((i) => i.importPath),
    ["./real", "./real2", "./dynamic"],
  );
  assert.deepEqual(imports.map((i) => i.lineNum), [3, 5, 6]);
});

test("extractImports ignores imports inside template literals", () => {
  const src = "const tpl = `import 'fake' from './fake'`;\nimport { x } from './real'";
  const imports = extractImports(src);
  assert.deepEqual(
    imports.map((i) => i.importPath),
    ["./real"],
  );
});

test("extractImports captures imports inside template interpolation", () => {
  const src = "const tpl = `${require('./inside').name}`;\nimport { x } from './real'";
  const imports = extractImports(src);
  assert.deepEqual(
    imports.map((i) => i.importPath),
    ["./inside", "./real"],
  );
});

test("extractImports handles export-from", () => {
  const src = "export * from './barrel';\nexport { a } from './named'";
  const imports = extractImports(src);
  assert.deepEqual(
    imports.map((i) => i.importPath),
    ["./barrel", "./named"],
  );
});
