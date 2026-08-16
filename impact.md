# Impact Analysis — Full AsyncStorage Replacement

**SQLite + Drizzle + MMKV migration for Harvi (`artifacts/mobile`)**

> **Audience:** Senior engineers, reviewers, and anyone who must sign off on this
> change or maintain the result.
> **Purpose:** This is an *impact playbook* — a detailed, educational walk-through of
> everything the AsyncStorage → (SQLite + Drizzle + MMKV) replacement touches: why
> each impact happens, how big it is, who feels it, and what we do about it.
> **Companion docs:** `plan.md` (what we build) and `docs/storage.md` (the engine
> comparison this decision is based on).
> **Version note:** Expo SDK 54 / React Native 0.81 / React 19 / Expo Router 6.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [How to Read This Document](#2-how-to-read-this-document)
3. [Scope — What Is Actually Changing](#3-scope--what-is-actually-changing)
4. [The Impact Axis Map](#4-the-impact-axis-map)
5. [Impact 1 — Runtime Performance](#5-impact-1--runtime-performance)
6. [Impact 2 — Cold-Start & User Experience](#6-impact-2--cold-start--user-experience)
7. [Impact 3 — Correctness & Data Integrity](#7-impact-3--correctness--data-integrity)
8. [Impact 4 — Security](#8-impact-4--security)
9. [Impact 5 — Binary & Bundle Size](#9-impact-5--binary--bundle-size)
10. [Impact 6 — Developer Experience](#10-impact-6--developer-experience)
11. [Impact 7 — Codebase & Architecture](#11-impact-7--codebase--architecture)
12. [Impact 8 — Testing](#12-impact-8--testing)
13. [Impact 9 — Release & Operations](#13-impact-9--release--operations)
14. [Impact 10 — Risk Register](#14-impact-10--risk-register)
15. [Impact on Future Features](#15-impact-on-future-features)
16. [The Cost-Benefit Verdict](#16-the-cost-benefit-verdict)
17. [Educational Appendix — Why These Impacts Happen](#17-educational-appendix--why-these-impacts-happen)
18. [References](#18-references)

---

## 1. Executive Summary

The replacement of AsyncStorage with **SQLite + Drizzle** (for relational data) and
**MMKV** (for key-value state) is a **net-positive change on every axis that
matters**, with two costs that must be managed deliberately:

**The wins (measured, structural, not cosmetic):**

| Axis | Impact |
|---|---|
| Offline-queue safety | Read-modify-write of a whole array + hand-rolled lock → **atomic single-row `INSERT`**. Eliminates the O(n²) growth cost and the torn-write window that can drop user progress |
| Cold-start UX | Async hydration + "warm memory cache" ceremony → **synchronous MMKV reads** for theme/profile/fkcol; flash-then-hydrate disappears |
| Queryability | "Load whole blob, filter in JS" → **real SQL**: indexes, `COUNT`, `WHERE`, `ORDER BY`, paging |
| Data integrity | No transactions → **ACID transactions**; schema constraints enforced by the engine instead of Zod-only |
| Type safety | Stringly keys + ad-hoc `JSON.parse` → **compile-time-checked schema and queries** (Drizzle) |
| Security | Plaintext caches → **AES-encrypted MMKV** for state; SecureStore untouched for tokens |
| Logout hygiene | Manual `multiRemove` key enumeration → **`DELETE ... WHERE user_id` + MMKV `clearAll()`** |

**The costs (bounded, managed):**

| Cost | Size | Mitigation |
|---|---|---|
| One-time legacy data migration | Medium risk (data copy) | Idempotent migrator, verify-before-delete, flag-gated dual-read |
| Drizzle sync-thread blocking | Real footgun on heavy queries | Chunked bulk imports, async API for import paths, narrow reads (§7 of plan) |
| New dependency + build config surface | Small | One-time ceremony; pinned versions |
| Team must hold SQL/schema literacy | Small ongoing | Boring SQL; Drizzle types; Studio tooling |

**Bottom line:** this is a *pay-now, earn-forever* migration. The user-visible wins
(cold start, queue reliability, offline consistency) are immediate; the strategic
wins (queryable local data, a schema foundation for bookmarks/favourites/wrong
questions) are what future features are built on.

---

## 2. How to Read This Document

Each impact section is written as a mini-playbook:

- **What changes** — the concrete before → after.
- **Why it happens** — the mechanism (educational).
- **Magnitude** — who notices, and by how much.
- **Risk** — what could go wrong.
- **Mitigation** — what the plan already does.
- **Won't change** — what stays the same, to keep scope honest.

If you only have 5 minutes, read §4 (the axis map), §16 (verdict), and §14 (risk
register).

---

## 3. Scope — What Is Actually Changing

### 3.1 The before-state

Harvi today runs a three-tier cache model (documented in `docs/STATE_MANAGEMENT.md`):

1. **In-memory** — Zustand + React Query (24 h `gcTime`, `offlineFirst`).
2. **Persistent disk** — AsyncStorage, ~9 key domains as JSON blobs.
3. **Remote ground truth** — Supabase.

AsyncStorage key domains (all being replaced):

| Key | Purpose | Replaced by |
|---|---|---|
| `harvi:quiz_queue` | Offline mutation queue | `quiz_results` table (`status='pending'`) |
| `harvi:qcache:<lectureId>` | Cached quiz questions | `questions` table |
| `harvi:hierarchy` | Year→Module→Subject→Lecture tree | 4 hierarchy tables |
| `harvi:progress:<uid>` | Completed-lecture IDs | `progress` table |
| `harvi:bestScores:<uid>` | Best score % per lecture | `best_scores` table |
| `harvi:stats:<uid>` | Aggregated stats | `user_stats` row |
| `harvi:access:<uid>` | Purchase access map | `access_map` table |
| `harvi:purchases:<uid>` | Purchase receipts | `purchases` table |
| `harvi:theme` / `avatar` / `displayName` / `quiz:fkcol` | KV state | MMKV |

### 3.2 The after-state

```
┌───────────────────────────────────────────────────────────────┐
│  expo-secure-store   → auth tokens + MMKV encryption key      │
│  MMKV (instances)    → theme, avatar, displayName, fkcol      │
│  SQLite + Drizzle    → queue, questions, hierarchy, progress, │
│                        best_scores, stats, access, purchases  │
│  AsyncStorage        → removed from package.json and src/     │
└───────────────────────────────────────────────────────────────┘
```

### 3.3 What is explicitly NOT changing

- Supabase, React Query, Zustand, the offline-first philosophy, the sync engine's
  backoff/timeout logic, the `PendingQuizResult` Zod schema, the question cache
  versioning gate, `expo-secure-store` auth flow.
- **All public service APIs** — call sites in `syncStore`, `cacheUtils`,
  `useQuizSession`, stats/progress/bestScore services keep their imports.
- No bookmarks/favourites/wrong-questions in this plan (later).

---

## 4. The Impact Axis Map

A single table mapping every axis, who feels it, direction, and magnitude.

| # | Axis | Who feels it | Direction | Magnitude |
|---|---|---|---|---|
| 1 | Runtime performance | End users (low-end Android hardest) | ✅ Improve | High |
| 2 | Cold-start & UX | End users | ✅ Improve | High |
| 3 | Correctness & data integrity | End users (progress loss = real loss) | ✅ Improve | High |
| 4 | Security | End users, compliance | ✅ Improve | Medium |
| 5 | Binary & bundle size | App-store reviewers, install size | ⚠️ Slight increase | Low |
| 6 | Developer experience | The team | ✅ Improve (after ceremony) | Medium |
| 7 | Codebase & architecture | The team | ✅ Improve | High |
| 8 | Testing | The team | ⚠️ More surface, better tools | Medium |
| 9 | Release & operations | The team, support | ⚠️ One-time rollout risk | Medium |
| 10 | Risk exposure | Everyone | ⚠️ Managed | Medium |
| 11 | Future features | Product, roadmap | ✅ Enables | High |

Two sections (5 & 6) carry the user-visible value; two (9 & 10) carry the
execution risk. Everything else is supporting cast.

---

## 5. Impact 1 — Runtime Performance

### 5.1 What changes

**Before:** every persistence op crosses the async bridge and serializes JSON.

- `offlineQueue.enqueueQuizResult` → read entire queue array → `JSON.parse` →
  push → `JSON.stringify` → write entire array. **Cost grows with queue size.**
- `questionCache.loadQuestionsFromCache` → bridge round-trip + `JSON.parse` of the
  whole lecture's questions on the JS thread.
- Stats/progress/bestScore services hydrate from AsyncStorage once, then serve from
  a module-level `memCache` — a workaround for the async cost.

**After:** SQLite transactions + indexes + narrow reads; MMKV synchronous reads.

### 5.2 Why it happens (educational)

1. **The bridge tax disappears.** AsyncStorage's Promise API is an artifact of the
   legacy async bridge. MMKV and expo-sqlite's sync API use **JSI** — direct C++
   function calls, no message queue, no JSON marshaling of the call itself.
2. **The JSON tax is removed where it matters.** MMKV typed getters (`getString`,
   `getNumber`) don't build a JS object tree. SQLite returns only the rows you ask
   for, not the whole blob.
3. **The queue becomes append-only.** AsyncStorage has no atomic "append to array"
   — you must rewrite the whole value. SQLite has atomic single-row `INSERT`s. This
   is the difference between O(1) and O(n²) cumulative work.
4. **Indexes beat scans.** "All pending results for user X" is a B-tree walk over
   `(user_id)` / `(status, created_at)` indexes, not a JS scan of a parsed array.

### 5.3 Magnitude

| Operation | Before (AsyncStorage) | After | Win |
|---|---|---|---|
| Read 1 small key (theme) | ~1–3 ms + JSON.parse | ~0.01–0.5 ms sync | ~5–20x |
| Hydrate N keys at startup | ~2.5 ms × N + parse | ~0.1 ms × N (MMKV) | ~20x amortized |
| Enqueue 1 queue item | Rewrite whole array (O(n)) | 1 row `INSERT` (O(1)) | Unbounded as n grows |
| pendingCount | Load + parse + filter whole array | `COUNT(*)` on index | Unbounded as n grows |
| Load 1 lecture's questions | Bridge + full JSON.parse | Indexed row query | Significant for large lectures |

**Caveat (the honest one):** Drizzle's expo-sqlite driver executes synchronously
even when awaited (issue #5240). A heavy query or bulk insert blocks the JS thread.
The plan counters this with chunked imports + the async API for bulk paths (§7 of
`plan.md`). Net effect for Harvi's real workloads (per-lecture reads, single-user
queries) is still a win — **but this must be validated on a low-end device, not
assumed.**

### 5.4 Risk & mitigation

- **Risk:** a naively ported bulk import (first question-bank download) janks the UI.
- **Mitigation:** chunked transactions with `await delay(0)` yields; measure on a
  2–3 GB Android device in Phase B acceptance.

### 5.5 Won't change

- React Query's network layer and `gcTime`/`networkMode` behavior.
- The optimistic-update flow (React Query cache write happens before any disk I/O).

---

## 6. Impact 2 — Cold-Start & User Experience

### 6.1 What changes

**Before:** the theme/profile/fkcol values can't be read before first render.

- `themeStore.initTheme()` is a `useEffect` that awaits `AsyncStorage.getItem` —
  users see the default theme flash before the saved theme applies.
- Stats/progress/best-scores screens render an empty/loading state until the "warm
  memory cache" async hydration completes.
- Cold start offline = a visible empty-until-await phase.

**After:**

- `themeStore` reads the theme **synchronously at module load** (`getString`).
- Profile fields and `harvi:quiz:fkcol` likewise — no async gate.
- Cached relational data hydrates from SQLite through the existing React Query
  layer (same UX contract), but the *KV state* that gates rendering is instant.

### 6.2 Why it happens (educational)

AsyncStorage is *architecturally incapable* of a synchronous read — the Promise is
not a choice, it's the bridge's contract. MMKV's JSI path returns values from the
memory-mapped file in a function call. When a value is small and hot (theme, avatar,
flag), sync is strictly better: there is no loading state to render, no race between
"query resolved" and "storage resolved," no `setState` after mount.

The "warm memory cache" functions (`warmStatsCache`, `warmProgressCache`,
`warmMemCache`) exist to *compensate* for this limitation. After the migration,
their raison d'être for MMKV values disappears; for SQLite values they can stay as a
thin sync read-layer or be absorbed by React Query's cache.

### 6.3 Magnitude

- **Felt:** every app launch, especially offline launches and low-end devices.
- **Quality bar impact:** Harvi's AGENTS.md demands an "offline-capable, polished"
  feel. Flash-then-hydrate is precisely the kind of polish defect this removes.
- **Directness:** this is the single most *user-visible* improvement in the whole
  plan, because it happens on every cold start, for every user.

### 6.4 Risk & mitigation

- **Risk:** a regression where the theme applies *later* than before (if we
  accidentally keep an async path). 
- **Mitigation:** synchronous module-load read; manual cold-start test in QA matrix.

### 6.5 Won't change

- The splash screen, first-paint flow, or Supabase auth gate ordering.

---

## 7. Impact 3 — Correctness & Data Integrity

### 7.1 What changes

**Before (queue):**

```
enqueueQuizResult:
  1. withQueueLock(...)          ← hand-rolled global promise chain
  2. readQueue()                 ← AsyncStorage.getItem + JSON.parse ENTIRE array
  3. queue.push(item)
  4. writeQueue()                ← JSON.stringify + setItem ENTIRE array
```

Failure modes:
- A crash between optimistic update and `setItem` loses the result.
- An interleaved read during a write (without the lock) sees a torn array.
- A burst of results rewrites the whole history each time (O(n²)).
- A single corrupt payload (`JSON.parse` failure) could previously knock out the
  whole queue; Zod validation recovers it today, but only *after* a failed parse.

**After (queue):**

```
enqueueQuizResult:
  INSERT INTO quiz_results (..., status='pending')   ← atomic, O(1)

flush:
  SELECT ... WHERE status='pending' ORDER BY created_at
  → POST to Supabase per item (unchanged timeout/backoff logic)
  → UPDATE quiz_results SET status='synced' WHERE id=?   ← one transaction
```

- No application-level lock needed: the **database transaction is the lock**.
- A crash mid-flush leaves rows in `pending`; they retry — exactly the idempotent
  behavior the sync engine already wants (server dedupes by `localId`).
- Constraints (`CHECK status IN ('pending','synced')`, `PRIMARY KEY`, `NOT NULL`)
  are enforced by the engine, not just by Zod at write time.

### 7.2 Why it happens (educational)

ACID matters for exactly this shape of workload:

- **Atomicity** — a transaction commits fully or not at all. AsyncStorage has no
  transaction; `multiSet` is not atomic in the crash sense.
- **Isolation** — concurrent writes serialize in SQLite. The `withQueueLock`
  promise chain was the application reimplementing this, at the cost of serializing
  *all* queue traffic behind one JS promise.
- **Durability** — with WAL + `synchronous=NORMAL`, committed rows survive process
  death. AsyncStorage's setItem is a native write, but the read-modify-write *window*
  (the actual data-loss bug) is a JS-level race that no amount of native durability
  fixes.

The migration also removes a class of bugs that *don't* exist yet but are latent in
the AsyncStorage design: two services writing the same key from different features,
schema drift in stored blobs, and partial multi-key updates on crash.

### 7.3 Magnitude

- **Felt:** only when things go wrong — and "wrong" here means *lost quiz results /
  lost progress*, which for a learning app is user trust, not just data.
- **Structural:** the plan deletes ~40 lines of lock/retry/defensive-parse machinery
  and replaces them with database semantics. Less code that can be wrong.

### 7.4 Risk & mitigation

- **Risk:** the one-time migration *itself* is the biggest correctness risk in the
  plan (moving live data between engines). See §13/§14.
- **Mitigation:** idempotent migrator, verify-counts-before-delete, flag-gated
  dual-read for one release.

### 7.5 Won't change

- The sync engine's 10 s timeout, 30 s backoff, duplicate-key (23505) handling —
  these live in `syncStore.tsx` and are untouched.

---

## 8. Impact 4 — Security

### 8.1 What changes

| Data | Before | After |
|---|---|---|
| Auth tokens / refresh tokens | `expo-secure-store` (Keychain/Keystore) | **Unchanged** — still SecureStore |
| Theme, avatar, display name, fkcol | Plaintext AsyncStorage files | **AES-encrypted MMKV** (key in SecureStore) |
| Quiz results, stats, progress, access, purchases | Plaintext AsyncStorage JSON | **Plaintext SQLite** (by default) — same exposure class as before |

### 8.2 Why it happens (educational)

- MMKV encryption is **at-rest AES** with the key supplied by the app. The correct
  pattern — used here — is: generate a 32-byte key once, store it in the OS
  Keychain/Keystore via `expo-secure-store`, pass it to MMKV. The key is never in
  the JS bundle, and `recrypt()` gives a rotation path.
- SQLite stays plaintext because its data (quiz results, caches) has the same
  sensitivity as the AsyncStorage data it replaces. Full-DB encryption (SQLCipher)
  is available if a future requirement (e.g., queued payment data) demands it — the
  schema doesn't change, only the engine config.
- **The security posture is strictly non-degrading:** nothing that was protected
  becomes less protected; one class of state data (MMKV) becomes *more* protected.

### 8.3 Magnitude

- **Felt:** security reviewers, and any future "at-rest data" requirement.
- **Direction:** improvement, not just neutral — plaintext preferences become
  encrypted at rest.

### 8.4 Risk & mitigation

- **Risk:** the classic MMKV footguns — hardcoded key, or changing the
  `encryptionKey` without re-encrypting (silent decrypt failures next launch).
- **Mitigation:** key generation + SecureStore persistence is a first-class step in
  `mmkv.ts`; the rotation caveat is documented in the file header; a decrypt smoke
  test is part of the QA matrix.

### 8.5 Won't change

- Biometric/permission flows, Supabase RLS, or anything server-side.

---

## 9. Impact 5 — Binary & Bundle Size

### 9.1 What changes

| Contribution | Approx. delta |
|---|---|
| `react-native-mmkv` native code | ~200 KB native (iOS + Android) |
| `expo-sqlite` native | Small–moderate (SQLite ships in the OS; binding is thin) |
| `drizzle-orm` (JS) | Small; tree-shaken to what's used |
| `drizzle-kit` | Dev-only — **not** shipped |
| `babel-plugin-inline-import` | Build-time only |
| `@react-native-async-storage/async-storage` | Removed (reclaimed) |

### 9.2 Why it happens (educational)

Native module size vs. JS bundle size are separate concerns. MMKV and expo-sqlite
add native binaries to the app; Drizzle adds JS to the bundle. Because Harvi ships
via EAS dev-client builds (not Expo Go), native additions are already the norm — this
is incremental, not structural. Bundle impact is minimized by Drizzle being a
headless ORM (no runtime entity tracking, imports tree-shake cleanly).

### 9.3 Magnitude

- **Felt:** app-store download size reviewers; users on data-capped installs.
- **Order:** low single-digit MB delta worst case, likely less. Not a gating factor.

### 9.4 Risk & mitigation

- **Risk:** none material. Verify with EAS build size reports before/after.

---

## 10. Impact 6 — Developer Experience

### 10.1 What changes

| Before | After |
|---|---|
| Stringly keys (`"harvi:progress:" + uid`) — typo = silent `null` | **Typed Drizzle schema** — column/table names compile-checked |
| Ad-hoc `JSON.parse` + `Zod` per read | Engine enforces structure; Zod only at boundaries |
| Hand-rolled locks and retries | Database transactions |
| No introspection | **Drizzle Studio** in the Expo dev menu (`shift+m`) — browse/edit on-device tables |
| Grep-based schema changes | **`drizzle-kit generate`** migrations |
| Warmup ceremony to compensate for async | Synchronous MMKV reads / narrow SQLite queries |

### 10.2 Why it happens (educational)

DX impact has two phases:

- **Ceremony up-front:** new deps, babel/metro config, a migrations workflow, SQL
  literacy. This is a one-time tax and it is real — new devs must understand "schema
  → generate → bundle → run migrations at startup."
- **Steady-state payoff:** after that, *every* future storage change is safer and
  faster. Renaming a column is a type error, not a runtime mystery. Inspecting a
  stuck queue row is a dev-menu click, not a logging expedition. Schema evolution is
  generated, not hand-written `user_version` arithmetic.

### 10.3 Magnitude

- **Felt:** every engineer touching storage, immediately and permanently.
- **Direction:** strongly positive, *after* a bounded onboarding cost.
- **Team requirement:** at least one person fluent in SQL/SQLite semantics (indexes,
  transactions, WAL). For the rest of the team, Drizzle's typed query builder lowers
  the bar compared to raw SQL.

### 10.4 Risk & mitigation

- **Risk:** the Drizzle sync-execution footgun surprises someone with a heavy query.
- **Mitigation:** documented in `plan.md` §7 and this doc §5.4; a code-review
  checklist item ("is this query on the async path?").

### 10.5 Won't change

- The React Query + Zustand conventions, the feature-sliced layout, or the AGENTS.md
  engineering rules (Drizzle *reinforces* the "no `any`" and type-safety culture).

---

## 11. Impact 7 — Codebase & Architecture

### 11.1 What changes

**New files:**

- `src/db/schema.ts`, `src/db/client.ts`, `src/db/migrate.ts`,
  `src/db/legacyMigrator.ts`, `src/shared/storage/mmkv.ts`

**Rewritten services (API-preserving):**

- `offlineQueue.ts`, `questionCache.ts`, `hierarchyService.ts`,
  `progressService.ts`, `bestScoreService.ts`, `statsService.ts`,
  `accessService.ts`, `useMyPurchases.ts`

**Touched:**

- `cacheUtils.ts`, `themeStore.tsx`, `useProfileEdit.ts`, `useProfileData.ts`,
  `questionService.ts`, `constants/storage.ts`, `app/_layout.tsx`,
  `babel.config.js`, `metro.config.js`, `app.json`, `package.json`,
  `docs/STATE_MANAGEMENT.md`, `docs/storage.md`

**Deleted conceptually:**

- The `withQueueLock` machinery, the manual `multiRemove` key enumeration in
  `cacheUtils`, the per-service AsyncStorage read/write helpers, the warmup
  functions whose only job was async compensation.

### 11.2 Why it happens (educational)

The codebase moves from **"store blobs under string keys, parse on demand"** to
**"define a schema, let the engine do the work."** That is a shift in *where
invariants live*: they move out of hand-written JS (`withQueueLock`, Zod recovery,
key enumeration) and into the database (constraints, transactions, indexes) and the
type system (Drizzle schema).

The **zero-call-site-churn** decision is what keeps this architecturally safe:
`syncStore`, `cacheUtils`, `useQuizSession`, and the stats/progress/bestScore
services all keep importing the same functions with the same signatures. The blast
radius of each rewritten service is its own file plus the one-time migrator.

### 11.3 Magnitude

- **Felt:** reviewers, maintainers, and the next feature that touches storage.
- **Line count:** roughly neutral-to-negative (more schema, far less defensive
  machinery) — a *less* fragile codebase for the same feature set.

### 11.4 Risk & mitigation

- **Risk:** API drift between a rewritten service and a caller that was missed.
- **Mitigation:** `typecheck` is the gate; the rewritten services keep their exact
  exported signatures; the migration is phased per service.

### 11.5 Won't change

- Feature-sliced directory structure, naming conventions, or the React Query/Zustand
  split of responsibilities.

---

## 12. Impact 8 — Testing

### 12.1 What changes

| Before | After |
|---|---|
| Services hard to test (AsyncStorage needs native/Jest mocks) | **Drizzle schema + queries run against in-memory SQLite in Node** — real SQL semantics in tests |
| Migration logic untestable | `legacyMigrator` tested with fixtures (happy path, empty, already-migrated, corrupt payload) |
| MMKV reads awkward to mock | In-memory mock mirroring the same method signatures |
| No schema verification | Migration N→N+1 test in CI for every schema change |
| Manual DB inspection impossible | Drizzle Studio + `PRAGMA integrity_check` debug screen |

### 12.2 Why it happens (educational)

SQLite's single-file design makes it the **most testable storage engine in the
stack**: `:memory:` databases run the exact same SQL your app runs, in a plain Node
test process. This is something AsyncStorage could never offer — its native
implementation can't be recreated in a unit test. The team gains *behavioral*
confidence (the SQL is right) rather than only *mock* confidence (the mock returns
what I told it to).

### 12.3 Magnitude

- **Felt:** CI and every future feature touching storage.
- **Direction:** more test surface, but genuinely better tools — a favorable
  trade.

### 12.4 Risk & mitigation

- **Risk:** the test suite becomes a *second* place the schema must be kept in sync.
- **Mitigation:** tests import the *same* schema module (`src/db/schema.ts`); only
  the driver differs (Node better-sqlite vs. expo-sqlite).

---

## 13. Impact 9 — Release & Operations

### 13.1 What changes

**The one-time on-device migration:**

```
App boots with new version
  → Drizzle migrations run (schema N+1)
  → legacyMigrator checks app_meta['async_migration_v1_done']
     → not done: read AsyncStorage keys, verify, write to SQLite/MMKV,
                  delete consumed keys, set flag
  → app continues with the new storage tier
```

**Rollout shape (per `plan.md`):**

- **Phase A:** foundation + migrations + migrator — *no behavior change*, ships safe.
- **Phase B:** SQLite replacement, flag-gated dual-read (legacy read-shim stays one
  release as rollback insurance).
- **Phase C:** MMKV for state; Phase D: remove AsyncStorage entirely.

### 13.2 Why it happens (educational)

Mobile migrations are different from server migrations: there is no "run the SQL
once against production." Every installed device runs its own copy, on its own
schedule, possibly while offline. That's why:

- migrations must be **bundled into the app** and applied at startup;
- the legacy copy must be **idempotent** (a device that half-migrated and crashed
  must finish, not duplicate);
- the delete of legacy data must happen **only after verification**, not before.

### 13.3 Magnitude

- **Felt:** the release engineer and support; users see one slightly longer first
  launch after the update (migrations + copy), then normal behavior.
- **Direction:** bounded, one-time, with clear rollback (the flag-gated dual-read).

### 13.4 Risk & mitigation

- **Risk (highest in the plan):** a large queue + large question cache on a low-end
  device makes the first launch slow; or a mid-migration crash leaves a device in a
  half-migrated state.
- **Mitigations:** chunked import with yields (no long JS-thread block); idempotent
  flag before the delete step; count verification before delete; dual-read shim as a
  rollback path; crash on the *copy* step retries next launch.

---

## 14. Impact 10 — Risk Register

Consolidated risk register with owners, likelihood, severity, and controls.

| # | Risk | L | S | Control |
|---|---|---|---|---|
| R1 | **Migration data loss** (copy→delete race, crash mid-copy) | Med | High | Idempotent migrator; verify-counts-before-delete; flag-gated dual-read for one release |
| R2 | **Drizzle sync-thread jank** on bulk import / heavy query | Med | Med | Chunked transactions + `await delay(0)`; async API for import paths; narrow normal reads; low-end-device QA |
| R3 | **MMKV encryption-key loss** (uninstall/reinstall) → undecryptable state | Low | Med | Key in SecureStore; document reinstall behavior; keep state non-critical (theme/avatar) |
| R4 | **MMKV key change without re-encrypt** → silent decrypt failure | Low | Med | `recrypt()` documented; smoke test in QA matrix |
| R5 | **Missed call-site** after service rewrite | Low | Med | `typecheck` gate; API-preserving rewrites |
| R6 | **Schema drift vs Supabase** (dynamic FK detection breaks) | Low | Med | Tables keyed by stable server IDs; reuse existing `detectFK` candidates |
| R7 | **Cache-version regression** (stale question cache served) | Low | Med | `CACHE_VERSION` gate preserved via `app_meta` |
| R8 | **Cross-user leakage** on sign-out | Low | High | `DELETE ... WHERE user_id` per table + MMKV `clearAll()`; QA matrix covers sign-out/sign-in |
| R9 | **WAL sidecar inconsistency** if DB ever snapshotted | Low | Low | Checkpoint before any future backup path |
| R10 | **Team SQL onboarding cost** | Med | Low | Drizzle typed API; documented patterns; boring SQL only |

**Residual risk after controls:** Low. The two risks worth continuous attention are
R1 (data migration) and R2 (thread jank) — both are bounded by design and verified by
the QA matrix.

---

## 15. Impact on Future Features

Although bookmarks, favourite questions, and wrong questions are **explicitly out of
scope** for this plan, the replacement has a direct strategic impact on them:

- **Bookmarks** (a user_id, lecture_id pair) → a trivial table on the normalized
  `hierarchy_lectures` foundation.
- **Favourite questions** (user_id, question_id) → the `questions` table already
  exists and is indexed by `lecture_id`; favourites need only a PK and a relation.
- **Wrong questions** (user_id, question_id + selected/correct state) → same; the
  normalized question content is already there to join against.

**The cost of NOT doing this replacement before those features:** each would have
been implemented as yet another AsyncStorage blob (read-all/filter-in-JS), which is
precisely the pattern this plan eliminates. The replacement is therefore a
**prerequisite investment** for the features you've already said you want — even
though it ships none of them.

---

## 16. The Cost-Benefit Verdict

### 16.1 Scorecard

| Axis | Direction | Weight | Confidence |
|---|---|---|---|
| Performance | ✅ | High | High (structural, measurable) |
| Cold-start UX | ✅ | High | High |
| Queue reliability | ✅ | High | High |
| Data integrity | ✅ | High | High |
| Security | ✅ | Med | High |
| Size | ⚠️ | Low | High |
| DX | ✅ | Med | High (after ceremony) |
| Architecture | ✅ | High | High |
| Testing | ✅ | Med | High |
| Release risk | ⚠️ | Med | Managed by design |
| Future features | ✅ | High | High |

### 16.2 The judgment

1. **The wins are structural, not anecdotal.** O(n²) queue → O(1) insert; async
   hydration → synchronous reads; blob scanning → indexed SQL; hand-rolled locks →
   engine transactions. Each is a *permanent* improvement that compounds as the data
   grows.

2. **The costs are one-time and bounded.** A ceremony cost in setup, a one-time
   migration with clear rollback, and a requirement that the team hold basic SQL
   literacy. None of these are recurring.

3. **The asymmetry is decisive:** doing nothing keeps latent data-loss and jank bugs
   forever; doing the migration retires them. The *only* scenario where this is the
   wrong call is if Harvi's storage needs never grow past a few MB of small blobs —
   and the roadmap (bookmarks, favourites, wrong questions) already disproves that.

**Verdict: proceed.** Phase A (foundation) is low-risk and reversible; it should ship
first so the riskiest parts (migration machinery) are exercised in isolation.

---

## 17. Educational Appendix — Why These Impacts Happen

### 17.1 Bridge vs. JSI — the latency chasm

```
AsyncStorage.getItem("harvi:theme")
  JS ──JSON encode──▶ queue ──▶ native ──▶ SQLite/file read ──▶ JSON encode ──▶ JS (Promise)

MMKV getString("harvi:theme")
  JS ──▶ C++ function call ──▶ memory-mapped read ──▶ value back
```

Every AsyncStorage call is a **message**; every JSI call is a **function call**.
That single architectural fact explains the ~5–30x gap. Educational takeaway: when
you see "async storage," ask *why* it's async — often it's the bridge, not the
storage.

### 17.2 mmap — why MMKV reads are memory reads

MMKV maps a file into virtual memory. A `getString` is a read from an address; the OS
page cache writes dirty pages back to disk asynchronously. That's the speed — and
the durability caveat (a value you just `set` may not be on physical disk for a
moment). For small, re-derivable state that's the right trade; it would be the wrong
trade for must-survive-power-loss data.

### 17.3 B-trees, indexes, and why "filter in JS" is the anti-pattern

SQLite stores each table in a B-tree. An index on `(user_id)` means "find rows for
this user" is O(log n) tree walk. Loading a JSON blob and filtering in JS means O(n)
allocations + O(n) comparisons, *plus* the parse cost, *every time* — even if you
only want one row. The database was built to answer questions; a KV store can only
hand you the whole answer sheet.

### 17.4 WAL — why SQLite writes got fast and safe

In WAL mode, writes append to a sidecar log instead of rewriting main DB pages;
readers never block the writer. Committed transactions survive crashes
(`synchronous=NORMAL`). This is the mechanism that makes the offline queue both
*faster* and *safer* than the AsyncStorage array rewrite.

### 17.5 ACID vs. "app-level locking"

`withQueueLock` is ACID-by-hand: the app reimplements atomicity with a promise chain.
It only covers the queue's own mutations; it can't protect cross-service invariants,
and it serializes all queue traffic. The database's transaction gives atomicity,
isolation, and durability *for free, and for all tables at once*.

### 17.6 At-rest encryption: keys vs. data

MMKV encrypts *data* with a key the app supplies. SecureStore protects *the key*
with the OS secure element. The two are complementary, not competing: SecureStore for
small, irreplaceable secrets (tokens, keys); MMKV/SQLite for bulk data. Never store
the encryption key next to the data it encrypts — which is what a hardcoded key would
be.

---

## 18. References

1. `plan.md` — the execution plan this impact analysis supports.
2. `docs/storage.md` — the engine comparison playbook (AsyncStorage / MMKV / SQLite /
   Drizzle).
3. `docs/STATE_MANAGEMENT.md` — the three-tier cache architecture being upgraded.
4. `artifacts/mobile/src/shared/services/offlineQueue.ts`,
   `src/features/quiz/services/questionCache.ts`, `src/features/learn/services/*`,
   `src/features/stats/services/statsService.ts`,
   `src/features/purchase/hooks/useMyPurchases.ts`, `src/shared/utils/cacheUtils.ts`,
   `src/shared/store/themeStore.tsx`, `src/shared/store/syncStore.tsx` — the files
   whose impact is analyzed above.
5. Drizzle ORM expo-sqlite driver — https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite
6. Drizzle + expo-sqlite sync-execution issue (thread blocking) —
   https://github.com/drizzle-team/drizzle-orm/issues/5240
7. react-native-mmkv — https://github.com/mrousavy/react-native-mmkv
8. Expo SQLite — https://docs.expo.dev/versions/latest/sdk/sqlite/

---

*End of impact playbook. Structural, device-dependent numbers (latency, size) should
be validated against Harvi's real payloads and target devices during Phase B
acceptance.*