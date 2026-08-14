# Harvi Docs System Audit

> Status: performed against `main` (commit e788977), verified against live source.
> Scope: `docs/` extractor pipeline, `graphing/` governance engine, generated outputs.

## Verdict

Overall grade: **C**.

The skeleton is genuinely good: an import-graph governance engine with idempotence
verification, plus 9 purpose-specific docs. But the extractors are regex heuristics
with systemic false positives and false negatives, several in places that matter
most. None are tested. None are CI-gated. Two artifacts claim "guaranteed 100%
accurate" where that is factually overbroad.

## Scorecard

| Doc | Grade | One-line verdict |
|---|---|---|
| ARCHITECTURE.md | B+ | Good artifact, honest descriptions — but overclaims "100% accurate"; flows are hand-maintained and undiffed |
| ARCHITECTURE_CHARTS.md | B | Solid mermaid graph |
| CONVENTIONS.md | B- | Useful (cross-feature violations are real) but has false negatives + noise rows |
| DEPENDENCIES_MAP.md | B- | Used/unused split useful; "unused" list misleading |
| HOOKS_AND_QUERIES.md | B- | Query keys + invalidation map genuinely helpful; params/deps truncated |
| NAVIGATION_MAP.md | C+ | Route tree correct; component column (the point) empty |
| API_SURFACE.md | C- | Misses half the calls it claims to list |
| OFFLINE_BEHAVIOR.md | C | Capability matrix misrepresents purchase/auth; sync pipeline is guessed |
| DATA_DICTIONARY.md | C- | Garbled types, truncated Zod, noisy drift |
| CACHE_MAP.md | D | Phantom key (`v3`) + inverted ownership attribution |
| ENV_AND_CONFIG.md | D | Critical env vars reported as nonexistent |

---

## Critical findings (wrong docs actively mislead agents)

### C1 — API_SURFACE.md silently misses half the DB calls

`api-surface.js:65` matches `supabase\.from("table")` on a single token run. Real
code is multiline:

```ts
const q = supabase        // progressService.ts:126
  .from("quiz_results")
```

The regex requires `supabase.from(` adjacent, so it misses:

- `questions` — `questionService.ts:48`
- `quiz_results` (read) — `progressService.ts:127`, `bestScoreService.ts:139`
- `user_stats` (read) — `statsService.ts:398`
- `purchases` — `useMyPurchases.ts:56`

The doc claims "Every Supabase call in the codebase" but shows 10 of ~15. An agent
trusting it will believe `questions` is never read and `purchases` is never touched.

### C2 — ENV_AND_CONFIG.md says "No env vars found" — they are the most critical ones

`env-and-config.js:59` regex is `process\.env\.NAME`. Real code (`supabase.ts:85`)
uses bracket access:

```ts
const supabaseUrl = process.env["EXPO_PUBLIC_SUPABASE_URL"]!;
```

Bracket access is never matched, so the two values required to run the app
(Supabase URL + anon key) are undocumented. A fresh agent/dev cannot configure the
app from the docs.

### C3 — CACHE_MAP.md read/write attribution is massively polluted

The question-cache key is declared as `const KEY = (id) => ...`. `cache-map.js`
stores that const name and later runs `content.includes("KEY")`, which
substring-matches `ACCESS_CACHE_KEY`, `PROGRESS_CACHE_KEY`, `CACHE_KEY`,
`HIERARCHY_CACHE_KEY` in every other service.

Result: `harvi:qcache:{id}` is reported as read/written by `accessService`,
`bestScoreService`, `hierarchyService`, `progressService`, `useProfileData`,
`useMyPurchases`, `statsService`, `offlineQueue` — every single one is false. The
same contamination hits `harvi:stats:{id}` and `harvi:bestScores:{id}`. The doc's
core value (who owns which key) is inverted.

### C4 — NAVIGATION_MAP.md component column is empty

Route files are `export { YearScreen as default } from "@/src/features/learn";`.
The re-export regex (`navigation-map.js:68`) only accepts `export { default }` or
`export { default as default }`, not `export { Name as default }`. All 12 screens
show `—` in the Screens table — the very column that makes the doc useful.

---

## Major findings (degraded trust, still usable)

### M1 — DATA_DICTIONARY.md column types are truncated/garbled

`data-dictionary.js:78` captures at most two tokens per column:

- `TEXT NOT NULL` -> `TEXT NOT`
- `INTEGER DEFAULT 0` -> `INTEGER DEFAULT`
- `UUID NOT NULL` -> `UUID NOT`

Line 172 (`feedback.status`) is outright mangled: the default value swallowed the
start of the CHECK constraint (`'new' CHECK (status IN ('new'`).

### M2 — DATA_DICTIONARY.md Zod tables are truncated

The field regex cuts on newline/comma: `weekly_activity` shows as `z.array(` and
`item_type` as `z.enum(["module"` (generated lines 379, 389). Nested/multiline Zod
fields are unreadable.

### M3 — Schema-drift warnings are noisy, unprioritized, unactionable

Flags design-intentional mismatches as drift:

- `price_cents` / `external_id` — server-only by design
- `streak`, `weekly_activity`, `question_count` — computed client-side
- `answer` (Zod) vs `correct_answer_index` (SQL) — a known rename the tool only
  half-handles

No mechanism to mark "known alias" or "intentional", so the reader gets 30+ rows
with zero signal.

### M4 — OFFLINE_BEHAVIOR.md is keyword-guessed, not traced

- `hasOfflineQueue` triggers on `content.includes("offlineQueue")`, so
  `shared/services/index.ts` (a barrel re-export) "has an offline queue".
- "Network error -> AsyncStorage fallback" fires in `themeStore.tsx` (a theme store).
- The Sync Pipeline assigns arbitrary `order` numbers then dedupes by `order` — it
  is not a real trace.
- The capability matrix is per-directory, so `purchase` (IAP is online-only) shows
  0 Supabase calls and "Cache OK" because the actual calls live in `shared/store` —
  mislabeled as offline-capable.

### M5 — CONVENTIONS.md misreports cacheStore

`hasHook` regex is `/export function use\w+/`. `cacheStore.ts:15` exports
`useCacheStore` as a const, so the doc claims no Hook though one exists. It also
lists `index.ts` and `supabase.ts` as "services" rows full of X (noise).

### M6 — DEPENDENCIES_MAP.md "unused" list is misleading

Flags `expo-blur`, `expo-image-picker`, `expo-location`, `expo-constants`,
`react-native-worklets`, `zod-validation-error` as "Potential Unused" because it
only counts `.ts/.tsx` imports and hardcodes a small exclusion list. Several are
used via app.json plugins / config / the native side. The caveat note helps but the
list actively misleads about what can be deleted.

### M7 — No CI gate, no staleness, no freshness signal

- `docs:generate` has no idempotence/exit-code check (the graphing engine has one).
- No workflow in `.github/` runs it; `scripts/post-merge.sh` does not either.
- Generated files carry no timestamp or source hash — consumers cannot tell if they
  are current.
- Outputs are committed, so they drift silently.

### M8 — Extractor standalone mode writes to repo root

Each extractor's `if (require.main === module)` writes to `projectRoot/` (e.g.
`API_SURFACE.md`), while the pipeline writes to `docs/generated/`. Running an
extractor directly pollutes the repo root and produces a different file location
than the pipeline — divergent copies.

---

## Moderate / minor findings

- **m1** — `generate.js:7` comment says "7 doc extractors"; there are 9.
- **m2** — `hooks-and-queries.js` params regex `\(([^)]*)\)` truncates at the first
  `)`: `scrollRef: React.RefObject<ScrollView | null>` shows as `... | null`.
  Invalidation regex only matches single literal keys (`queryKey: ["x"]`), so
  `["lectureBestScores", user?.id]` invalidations are not captured.
- **m3** — `hooks-and-queries.js` dep detection uses `funcBody.includes("useAuth")`
  — matches comments/strings; `timeoutPromise` (a helper) appears as an
  invalidation trigger.
- **m4** — `api-surface.js` operation lookahead is a fixed 300 chars; RPC param
  regex `\{[^}]*\}` fails on nested/multiline objects.
- **m5** — `cache-map.js` chunking detection is `content.includes("chunk")` —
  guesswork.
- **m6** — `conventions.js` `hasProvider` is `A || (B && A)` — redundant.
- **m7** — ARCHITECTURE.md node `react_query` maps to `app/_layout.tsx` — the same
  file as the `app` node; two nodes, one path.
- **m8** — Docs are split across `docs/`, repo root (`ARCHITECTURE*.md`),
  `Design/`, `My Skills/` with no central index or regen instructions.
- **m9** — No tests anywhere for the extractors; a source-formatting change
  silently alters doc accuracy with nothing failing.
- **m10** — Emoji-heavy headers plus "guaranteed / 100% accurate" language in the
  very files with the worst accuracy.

---

## Evidence

Every finding above was verified against the working tree. Key reference points:

- `artifacts/mobile/src/shared/services/supabase.ts:85-86` — bracket env access
- `artifacts/mobile/src/features/learn/services/progressService.ts:126-128` —
  multiline `.from()`
- `artifacts/mobile/src/features/quiz/services/questionCache.ts:16,20` — `KEY`
  const and `v3` version constant
- `artifacts/mobile/src/features/learn/services/accessService.ts:13,19,41` —
  `ACCESS_CACHE_KEY` causing `KEY` collisions
- `artifacts/mobile/app/(main)/(tabs)/(learn)/year/[id].tsx:1` — `Name as default`
  re-export form
- `artifacts/mobile/src/shared/store/cacheStore.ts:15` — const-exported `useCacheStore`
- `docs/generated/` — the generated outputs containing the wrong rows described above
