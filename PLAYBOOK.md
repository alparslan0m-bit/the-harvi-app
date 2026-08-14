# Harvi Docs Playbook

Living maintenance guide for the documentation system.

- Pipeline A (static extractors): `pnpm run docs:generate` -> `docs/generated/*.md`
- Pipeline B (architecture graph): `node graphing/verify_graph.js` -> `ARCHITECTURE.md`, `ARCHITECTURE_CHARTS.md`
- See `docs/AUDIT.md` for the findings this playbook addresses.

---

## Part A — Regeneration runbook

Run **Pipeline A** after any change to `src/`, `app/`, `supabase/migrations/`, or
`package.json`:

```
pnpm run docs:generate
```

Run **Pipeline B** after any import-structure change — **twice**:

```
node graphing/verify_graph.js
node graphing/verify_graph.js   # must exit 0 (idempotence check)
```

Before committing:

1. Grep `docs/generated/` for `—` (empty cells). Empty cells mean a regex missed
   its target — investigate before committing.
2. Eye the diff: counts should move in the expected direction. Adding a query must
   increment API_SURFACE's database-query count. Suspicious drops = the extractor
   lost a pattern.
3. Do not commit if either command reports failures or changes.

---

## Part B — Fix-it playbook (per extractor)

Priority order: highest impact first.

1. **`env-and-config.js`** — extend the regex to bracket access:
   `process\.env\.(?:EXPO_PUBLIC_[A-Z0-9_]+|\["?(EXPO_PUBLIC_[A-Z0-9_]+)"?\])`.
   Re-add an `.env.example` convention listing required vs optional variables.
   *(Fixes AUDIT C2.)*

2. **`api-surface.js`** — match multiline chains: normalize whitespace between
   `supabase` and `.from(` (or use a regex that allows `.` + optional newlines +
   indentation before `.from`). Add a test asserting `questions`, `purchases`,
   `user_stats`, and `quiz_results` all appear. *(Fixes C1.)*

3. **`cache-map.js`** — scope const-name matching to a full, unique identifier
   (`\bKEY\b`), or better: restrict operation counting to the file where the key
   was *defined*. Exclude values whose const name doesn't end in
   `_KEY` / `_CACHE_KEY` / `QUEUE_KEY` (kills the `v3` phantom). *(Fixes C3.)*

4. **`navigation-map.js`** — extend the re-export regex to
   `export\s*\{\s*(\w+)\s+as\s+default\s*\}\s*from\s*["']([^"']+)["']`, with a
   fallback that resolves the barrel export. *(Fixes C4.)*

5. **`data-dictionary.js`** — scan full column types (token-class parser, stop at
   `DEFAULT | REFERENCES | CHECK | NOT | PRIMARY | UNIQUE | ,`). Add an explicit
   alias table (`order` <-> `order_index`, `answer` <-> `correct_answer_index`)
   and an "intentional / server-only / client-only" marker so drift output only
   shows real drift. *(Fixes M1, M2, M3.)*

6. **`hooks-and-queries.js`** — use a brace-matcher for params; match
   `queryKey: [\s\S]*?\]` for invalidations; drop `timeoutPromise` from triggers.
   *(Fixes m2, m3.)*

7. **`offline-behavior.js`** — scope queue detection to actual
   `enqueue` / `getQueue` / `flush` call sites; trace the sync pipeline explicitly
   from `syncStore.tsx`; compute the matrix per feature *including* shared code it
   depends on. *(Fixes M4.)*

8. **`conventions.js`** — `hasHook` must also match `export const use\w+`; exclude
   `index.ts` / `supabase.ts` from the services table. *(Fixes M5.)*

9. **`dependencies.js`** — treat app.json `plugins` and babel config entries as
   usage; flag only production `dependencies` (not devDependencies) as unused.
   *(Fixes M6.)*

---

## Part C — Governance playbook

1. **CI gate** — add a GitHub Action that runs `docs:generate` and
   `verify_graph.js`, then fails on any diff. `verify_graph.js` already exits 1 on
   drift; `docs:generate` needs an equivalent check. This eliminates silent
   staleness. *(Fixes M7.)*
2. **Trust rules** — replace "guaranteed 100% accurate / derived directly from the
   codebase" with precise phrasing: *structure is verified against the import
   graph; descriptions and flows are human-curated — validate before trusting.*
   Do the same in extractor headers.
3. **Freshness stamp** — emit `> Generated at <ISO timestamp> · source <sha>` at
   the top of every generated file; hash content *before* the stamp in CI so
   timestamp-only diffs don't fail the gate.
4. **Standalone mode** — point each extractor's `require.main` write to
   `docs/generated/` so direct runs match the orchestrator. *(Fixes M8.)*
5. **Doc index** — add `docs/README.md`: one table of all 9 generated docs +
   ARCHITECTURE*.md, what each is, who consumes it, and the regen command.
   *(Fixes m8.)*

---

## Part D — New-doc playbook (adding extractor #10)

1. Scaffold from an existing extractor (copy the `walk()` + `generate()` skeleton).
2. **Write the fixture test first** — a tiny sample source dir; run your regex;
   assert expected rows. Do not merge a new regex extractor without a test.
   *(Prevents m9 from recurring.)*
3. Declare `module.exports = { generate, name: "X.md" }` — the orchestrator picks
   it up automatically.
4. Regenerate, diff, and add a row to `docs/README.md`.

---

## Part E — Audit re-run checklist (after every significant feature)

- Run `pnpm run docs:generate`: note files that produced `—`, new tables, dropped
  counts.
- Run `node graphing/verify_graph.js` twice — second run must exit 0.
- Spot-check 5 rows per doc against source. This audit found wrong rows in 9 of 9
  docs — assume every doc is wrong until verified.
- Grep generated docs for truncated tokens: `z.array\($`, `enum\(\[`, `TEXT NOT$`,
  `KEY.*read by`.