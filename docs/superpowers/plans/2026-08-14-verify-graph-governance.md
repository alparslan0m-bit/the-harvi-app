# verify_graph.js Governance Remediation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 10 audit findings in `graphing/verify_graph.js` (Critical + High + Medium) via a testable refactor, so the governance engine reports honestly, never loses dependencies silently, and exits non-zero on any drift.

**Architecture:** Extract the monolithic side-effectful script into (a) `graphing/config.js` holding all curated truth, (b) pure pipeline functions in `graphing/verify_graph.js` returning a result object without writing, (c) a thin CLI entry guarded by `require.main === module`, and (d) pure render/report functions. Node's built-in test runner (`node --test`) provides TDD with zero new dependencies. Remote-node detection becomes a single declarative pass; `hasChanges` becomes total (covers flows, stale metadata, and every artifact).

**Tech Stack:** Node 22 (available here — `node:test`), CommonJS, pnpm workspace, `module.exports` data files in `graphing/data/`.

## Global Constraints
- Node `>= 20` (uses `node:test`, `node --test`). Current shell has Node 22.
- No new dependencies. Testing uses built-in `node:test`.
- `graphing/data/*.js` format (`module.exports = [...]`) is public — do not break consumers (`architecture.html`, `generate.js`).
- Generated files (`ARCHITECTURE.md`, `ARCHITECTURE_CHARTS.md`, `architecture.json`, `architecture.html`, `data/*.js`) are deterministic: a second run of the same tree must produce identical bytes.
- First run after a behavior change is **expected** to exit 1 ("data corrected"); a second run must exit 0. That's the idempotence contract.
- Mermaid output must stay valid (`flowchart LR`, quoted ids).
- Commit style follows repo history (`git log` shows `graphing`, `prettier / graphing`, `Auto generated Docs ✨✨`): use `graphing: <short description>`.

## File Structure
- `graphing/config.js` — NEW. `nodeMapping`, `externalPackageMap`, `remoteNodes`, `supabaseClientImplicitRemotes`, `orderedLayers`, `layerClasses`. Moved verbatim from the script.
- `graphing/verify_graph.js` — REFACTOR. Exports `walk`, `stripCommentsAndStrings`, `extractImports`, `validateNodeMapping`, `classifyFiles`, `resolveImportToNode`, `detectRemoteUsage`, `buildVerifiedNodes`, `buildVerifiedEdges`, `runGovernance`, `writeOutputs`, `renderArchitectureMd`, `renderChartsMd`, `renderReport`, `main`. CLI guarded by `if (require.main === module)`.
- `graphing/verify_graph.test.js` — NEW. `node:test` suites + a `makeFixtureTree()` helper (`fs.mkdtempSync` under `os.tmpdir()`, cleaned in `after`; clears `require.cache` for temp data paths).
- `package.json` (root) — MODIFY. Add scripts: `"graph:verify": "node graphing/verify_graph.js"` and `"test:graph": "node --test graphing/verify_graph.test.js"`.

## Key Function Signatures (used by later tasks — update verbatim on mismatch)
```js
// config.js
module.exports = {
  nodeMapping: { /* moved verbatim from verify_graph.js:36-108 */ },
  externalPackageMap: { /* verbatim :111-118 */ },
  remoteNodes: {
    supabase_auth:      { patterns: [/supabase\.auth\./], description: "..." },
    supabase_db:        { patterns: [/supabase\.from\(/, /supabase\.rpc\(/], description: "..." },
    supabase_functions: { patterns: [/supabase\.functions\.invoke\(/], description: "..." },
  },
  supabaseClientImplicitRemotes: { supabase_client: ["supabase_auth", "supabase_db"] },
  orderedLayers: ["presentation", "application", "infrastructure", "external"],
  layerClasses: { /* 4 layers + unknown: neutral gray dashed */ },
};

// verify_graph.js
stripCommentsAndStrings(content)                    => string  // same length, strings/comments blanked with spaces (preserves match.index/line math)
extractImports(content)                             => [{ importPath, lineNum }]  // from/import/require/dynamic import(), comment-safe
validateNodeMapping(nodeMapping, projectRoot)       => { validatedNodeMapping, sortedPatterns, stalePatterns }
classifyFiles(allFiles, sortedPatterns, projectRoot) => { fileToNode, nodeToFiles, discoveredLocalNodes, classifyFile }
resolveImportToNode(importPath, currentFile, { projectRoot, externalPackageMap, fileToNode, classifyFile, discoveredExternals }) => { nodeId } | { nodeId: null, reason: "external-unmapped"|"resolved-unmapped"|"unresolvable" }
detectRemoteUsage(content, remoteNodes)             => [{ remoteId, lineNum, snippet }]
runGovernance({ projectRoot, mobileRoot, supabaseFunctionsDir, dataDir, config }) => result // pure, no fs writes
writeOutputs(result, { nodesPath, edgesPath, jsonPath, htmlPath, mdPath, chartsMdPath, templatePath }) => { changedPaths: string[] }
renderArchitectureMd(nodes, flows)                  => string
renderChartsMd(nodes, archEdges, orderedLayers, layerClasses) => string
renderReport(result)                                => string
// result: { verifiedNodes, verifiedArchEdges, verifiedFlowEdges, verifiedEdges, allNodeIds, nodeToFiles,
//           flowWarnings, edgeEvidence, droppedImports, stalePatterns, staleMetadataPaths,
//           existingNodes, existingEdges, existingFlowTriggerEdges,
//           addedNodes, removedNodes, addedEdges, removedEdges,
//           nodesChanged, edgesChanged, hasChanges, jsonString, htmlString, mdString, chartsMdString }
```
Test helper in `verify_graph.test.js`:
```js
const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = require("fs");
const os = require("os"), path = require("path");
// makeFixtureTree(layout) -> root (tmp dir); caller runs
// rmSync(root, { recursive: true, force: true }) in t.after()
```

---

### Task 1: Structural refactor — extract config + pure pipeline, zero behavior change

**Files:** Create `graphing/config.js`, `graphing/verify_graph.test.js`, `graphing/verify_graph.js` (rework); Modify root `package.json`.

**Interfaces:** Produces the full exported API above. Q1 the real-repo output must match committed artifacts byte-for-byte.

- [ ] **Step 1: Write the refactor regression test (fails first).**
  ```js
  const { test } = require("node:test");
  const assert = require("node:assert");
  const path = require("path");
  const { runGovernance } = require("./verify_graph");
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
  ```
  Run: `node graphing/verify_graph.test.js` → FAIL: `verify_graph` does not export `runGovernance`.
  Also add a smoke test for `walk` (finds `.ts/.tsx`, skips `node_modules`/`.expo`) at this step.

- [ ] **Step 2: Extract `graphing/config.js`.** Move `nodeMapping`, `externalPackageMap`, `remoteNodes` verbatim (`verify_graph.js:36-134`); add `supabaseClientImplicitRemotes`, `orderedLayers`, `layerClasses`.

- [ ] **Step 3: Refactor `verify_graph.js` into the exported module.** Move all existing logic inside the pure functions; `main()` composes `runGovernance` → `writeOutputs` → `renderReport` → exit. Guard: `if (require.main === module) main();`. Keep logic **identical** — buggy pieces included — so the byte-for-byte test passes. Move md/chart/html generation into pure render functions now (content unchanged).

- [ ] **Step 4: Run test to verify pass.**
  Run: `node graphing/verify_graph.test.js` → PASS.
  Run: `node graphing/verify_graph.js` → prints PASSED, exit 0; second run exit 0. Confirm `git diff --stat graphing/data` is empty (relative to pre-task state).

- [ ] **Step 5: Add root scripts** `graph:verify` + `test:graph` to `package.json`.

- [ ] **Step 6: Commit.** `graphing: refactor into testable module, extract config`.

---

### Task 2: Comment/string-safe import scanning (Finding 6)

**Files:** Modify `graphing/verify_graph.js` (`stripCommentsAndStrings`, `extractImports`), `graphing/verify_graph.test.js`.

**Interfaces:** Consumes nothing new; replaces the three regexes at current `:329-357`. Produces `extractImports` `[{importPath, lineNum}]`; `lineNum` = 1-based line of the match on the **unstripped** content (strip preserves byte count, so `content.substring(0, i).split("\n").length` still works).

- [ ] **Step 1: Write failing tests.**
  ```js
  const { stripCommentsAndStrings, extractImports } = require("./verify_graph");
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
  ```
  Run → FAIL (functions undefined).

- [ ] **Step 2: Implement** `stripCommentsAndStrings` — single pass tokenizer handling `//`, `/* */`, `'`, `"`, backtick templates (with `${}` nesting), escapes; blank out non-code with spaces, keep newlines. Then `extractImports` runs four regexes on the stripped content: `from\s+['"]([^'"]+)['"]`, `import\s+['"]([^'"]+)['"]`, `require\(\s*['"]...`, and NEW `import\(\s*['"]...` (dynamic imports were previously missed). Make regexes non-global per invocation (recreate per call to avoid `lastIndex` issues).

- [ ] **Step 3: Run tests → PASS.**

- [ ] **Step 4: Integration.** Run `node graphing/verify_graph.js` twice. Log how edges changed (any imports that previously lived in comments/strings vanish from `edges.js`; dynamic imports may appear). **Commit the corrected data.**

- [ ] **Step 5: Commit.** `graphing: comment/string-safe import extraction with dynamic imports`.

---

### Task 3: Surface dropped imports (Finding 4)

**Files:** Modify `graphing/verify_graph.js` (`resolveImportToNode`, `runGovernance`, `renderReport`), test file.

**Interfaces:** `resolveImportToNode` returns `{nodeId}` or `{nodeId:null, reason}`. `reason ∈ {external-unmapped, resolved-unmapped, unresolvable}`. `result.droppedImports` = `[{ fromNode, targetPath, reason, files:[{file,lineNum,importPath}] }]` (dedup by `fromNode|targetPath|reason`). Dropped imports are **advisory only** (do not force exit 1) — real shared code isn't a node.

- [ ] **Step 1: Write failing tests.**
  ```js
  test("import to unmapped file is reported as resolved-unmapped", async (t) => {
    const root = makeFixtureTree({
      "app/_layout.tsx": `import x from '../src/helper';`,
      "src/helper.ts": `export const x = 1;`,
    });
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const result = runGovernance({
      projectRoot: root,
      mobileRoot: path.join(root, "app"),
      supabaseFunctionsDir: path.join(root, "supabase", "functions"),
      dataDir: path.join(root, "data"),
      config: require("./config"),
    });
    const drop = result.droppedImports.find((d) => d.targetPath === "../src/helper");
    assert.ok(drop, "dropped import must be recorded");
    assert.strictEqual(drop.reason, "resolved-unmapped");
  });
  ```
  Run → FAIL (no `droppedImports`).

- [ ] **Step 2: Implement.** In `resolveImportToNode`, classify each null: external non-scoped/scoped unknown package → `external-unmapped`; resolved `.ts/.tsx` file with no node → `resolved-unmapped`; file not found → `unresolvable`. Collect in `runGovernance`. In `renderReport`, add a `⚠️ UNMAPPED IMPORTS: N` section listing up to 5 samples (`fromNode -> targetPath [reason]`), full list when a `--verbose` flag is set on `result`.

- [ ] **Step 3: Run tests → PASS.**

- [ ] **Step 4: Commit.** `graphing: report unmapped import targets instead of dropping silently`.

---

### Task 4: Single declarative remote-node pass (Findings 2, 3, 7)

**Files:** Modify `graphing/verify_graph.js` (`detectRemoteUsage`, `runGovernance` edge-building), test file.

**Semantics (explicit decision):** a mapped file that directly invokes a remote API edges **to the remote node** (`fromNode -> remoteId`), with real evidence (`file`, 1-based `lineNum` of first match, `snippet` of the matched line). `supabase_client` additionally gets implicit `supabase_auth`/`supabase_db` edges when `createClient`/`createClientWithOptions` appears in its content (config-driven `supabaseClientImplicitRemotes`). This replaces and deletes: the dead loop (`:388-407`), the hardcoded `createClient` block (`:416-442`), the `functions.invoke` block (`:444-462`). The edge-functions dir walk (`:464-486`) is kept as a config-driven source producing `supabase_functions -> supabase_db`.

- [ ] **Step 1: Write failing tests.**
  ```js
  test("non-client node directly using supabase.from() gets a DB edge with line evidence", async (t) => {
    const root = makeFixtureTree({
      "app/_layout.tsx": `// app`,
      "features/access/service.ts": `import { supabase } from '../../shared/services/supabase';
  export const go = () => supabase.from('t').select('*');`,
      "shared/services/supabase.ts": `export const supabase = { from: (t) => ({ select: () => {} }) };`,
    });
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const result = runGovernance({ /* roots as in Task 3 */ });
    const key = "access_service->supabase_db";
    // (config nodeMapping needs a matching feature dir for this test — see Note below)
    assert.ok(result.edgeEvidence.get(key), key + " must exist");
    const ev = result.edgeEvidence.get(key)[0];
    assert.ok(ev.lineNum >= 1, "evidence must carry a real line number");
  });
  ```
  Run → FAIL.
  > **Note for executor:** `config.nodeMapping` has no `access_service`-style feature dir in a fixture. Add a fixture-scoped config: `runGovernance` accepts `config` — tests pass `{ ...require('./config'), nodeMapping: { access_service: ['.../features/access'], supabase_client: ['.../shared/services/supabase.ts'] } }` so classification works against fixture paths.

- [ ] **Step 2: Implement `detectRemoteUsage(content, remoteNodes)`** → `[{ remoteId, lineNum, snippet }]` via `content.indexOf` per pattern (find first non-overlapping match, compute line, grab trimmed line as snippet). Rewrite runGovernance edge pass to a single loop over mapped files: after import edges, call `detectRemoteUsage`; add edges; for `supabase_client` add implicit remotes only if `(createClient|createClientWithOptions)` present, with evidence `snippet = createClient line`. Edge-functions dir: walk `.ts/.tsx`, `detectRemoteUsage` against db patterns, add `supabase_functions->supabase_db` with real file evidence. Delete the three legacy blocks.

- [ ] **Step 3: Run tests → PASS.**

- [ ] **Step 4: Integration.** Run `node graphing/verify_graph.js`. Expect new arch edges (e.g. `hierarchy_service->supabase_db`, `profile_feature->supabase_auth`, `quiz_feature->supabase_functions` where `functions.invoke` lives) and possibly removal of the wrongly-attributed `supabase_client->supabase_functions` edge. Review the reported added/removed edges; run again → exit 0. **Commit corrected data.**

- [ ] **Step 5: Commit.** `graphing: single-pass remote detection with real evidence`.

---

### Task 5: Total governance: flows + all artifacts in exit code (Findings 1, 8)

**Files:** Modify `graphing/verify_graph.js` (`writeOutputs`, `main`/`hasChanges`, `renderReport`), test file.

**Interfaces:** `result.flowWarnings` (as today). `writeOutputs` returns `{changedPaths: string[]}` comparing **new vs existing bytes on disk** for all six outputs (`nodes.js`, `edges.js`, `architecture.json`, `architecture.html`, `ARCHITECTURE.md`, `ARCHITECTURE_CHARTS.md`) before writing. `main` exit 1 iff any of: node/edge/stale-pattern deltas, `flowWarnings.length`, `staleMetadataPaths.length` (Task 6 slot), or `changedPaths.length`.

- [ ] **Step 1: Write failing tests.**
  ```js
  test("flow referencing a missing node forces the governance check to fail", () => {
    const result = { flowWarnings: [{ flowId: "f", flowName: "x", stepOrder: 1, missingNode: "ghost" }],
                     ...emptyDeltas() };
    assert.strictEqual(computeHasChanges(result), true); // export computeHasChanges or test main() exit via child process
  });
  test("template.html edit is detected as a change", async (t) => {
    // fixture tree + writeOutputs into fixture outputs; first run -> changedPaths includes architecture.html
  });
  ```
  Run → FAIL.
  > Test via child process: `spawnSync(node, [verify_graph, '--fixture', root])` asserting `status === 1`, is acceptable for the exit-code tests; keep pure-unit tests for `computeHasChanges`.

- [ ] **Step 2: Implement.** `writeOutputs` reads each target (or `""` if absent) and compares before writing; collects changed paths. `main` folds them into `hasChanges`. `flows.js` is intentionally never rewritten — document in report (`flows.js is curated; fix referenced nodes to clear warnings`).

- [ ] **Step 3: Run tests → PASS.** Confirm real double-run exits 0; manually add a bogus flow ref in a temp copy → exits 1.

- [ ] **Step 4: Commit.** `graphing: fail governance on flow warnings and artifact drift`.

---

### Task 6: Node path validation (Finding 5)

**Files:** Modify `graphing/verify_graph.js` (`buildVerifiedNodes`), test file.

**Interfaces:** `buildVerifiedNodes` derives `path` for **local** nodes from the longest validated `nodeMapping` pattern; external nodes (source `externalPackageMap`/`remoteNodes`) keep curated `path` (package name) or the package name. If a curated local `path` differs from the derived one **and** the curated path no longer exists on disk → push to `staleMetadataPaths` (`{ nodeId, curatedPath, derivedPath }`) which participates in `hasChanges` (Task 5).

- [ ] **Step 1: Write failing test.** Existing node with `path: "artifacts/mobile/src/features/learn/services"` (wrong/old) + matching nodeMapping → `staleMetadataPaths` contains entry; result `verifiedNodes` has corrected `path`.

- [ ] **Step 2: Implement.** In `buildVerifiedNodes`: compute derived path; only treat as stale when `!fs.existsSync(projectRoot/curatedPath)`. Round-trip the rest of metadata. Add `staleMetadataPaths` to report + `hasChanges`.

- [ ] **Step 3: Run tests → PASS.** Real run: confirm only genuinely-moved paths flag; the 3 external package-name `path`s are exempt.

- [ ] **Step 4: Commit.** `graphing: validate node metadata paths against disk`.

---

### Task 7: Consistent doc ordering + no dangling layers (Findings 9, 10)

**Files:** Modify `graphing/verify_graph.js` (`renderArchitectureMd`, `renderChartsMd`), test file.

**Interfaces:** Both renderers iterate `config.orderedLayers`. `renderArchitectureMd` lists each layer in `orderedLayers` then appends leftover layers (e.g. `unknown`) as a final `### OTHER LAYER` section. `renderChartsMd` emits a `MISC` subgraph for nodes whose layer ∉ orderedLayers, styled with a new `unknown` classDef (gray, dashed) from `layerClasses`.

- [ ] **Step 1: Write failing tests.** `renderArchitectureMd` places an unknown-layer node last under "OTHER LAYER"; `renderChartsMd` contains `subgraph MISC` and `:::unknown` and the unknown node inside it; both renderers produce identical section order for the four known layers (`presentation → application → infrastructure → external`).

- [ ] **Step 2: Implement.** Refactor both renderers to share `orderNodes(nodes, orderedLayers)`.

- [ ] **Step 3: Run tests → PASS.** Regenerate artifacts; `ARCHITECTURE.md`/`_CHARTS.md` section order now matches.

- [ ] **Step 4: Commit.** `graphing: consistent layer ordering and unknown-layer rendering`.

---

### Task 8: Final stabilization + verification

- [ ] **Step 1:** Run full suite: `node --test graphing/verify_graph.test.js` — all PASS.
- [ ] **Step 2:** `node graphing/verify_graph.js` twice — both exit 0, no diff on second run.
- [ ] **Step 3:** Add regressions for the exact audit repros to the test file (comment-import fixture, dead-loop absence: `runGovernance` on a tree with a supabase-using feature produces exactly one `fromNode->remote` edge and no `supabase_client->supabase_functions` phantom when no function invokes), run once.
- [ ] **Step 4:** Commit. `graphing: finalize governance remediation`.

---

**Committed-data note:** Tasks 2 and 4 will correct `graphing/data/edges.js` and regenerate `architecture.*`, `ARCHITECTURE.md`, `ARCHITECTURE_CHARTS.md`. Task 1's regression test guarantees no *unintended* drift; Tasks 2–7 are the intended corrections.