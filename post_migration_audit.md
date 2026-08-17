# Post-Migration Architecture Audit — Harvi Mobile

## Executive Summary

The AsyncStorage → SQLite/MMKV/SecureStore migration is structurally complete: `package.json` has no AsyncStorage dependency, no `src/` file imports it, and all nine cache domains now live in their correct tier. However, **the codebase retains a significant ghost of the old architecture** — three parallel `warmMemCache`/`memCache`/`warmed` ceremonies (progress, bestScores, stats) that existed solely to paper over AsyncStorage's async reads, plus raw SQL scattered across five services that bypasses the Drizzle query builder the repositories were built for. There are also four dead files, one dead table, and one legacy-ID shim that can be retired. Below: a triaged inventory, concrete rewrite proposals, and a prioritized roadmap of what the new layer unlocks.

---

## Part 1 — Leftover AsyncStorage-era Artifacts (Triage)

### 1.1 Warm Memory Cache Ceremony

The `warmMemCache` / `memCache` / `warmed` pattern was designed for one reason: AsyncStorage reads were async, and React Query's `initialData` needs a synchronous value. The pattern warms a module-level `Map`/`Set` from disk at session start so subsequent hook mounts can serve `initialData` without an await.

With SQLite via the sync driver, reads are still gated behind `getDb()` (an async singleton), so the pattern is **still load-bearing** — it prevents a blank flash on re-mounts. However, it is **over-engineered** now: the warm step is itself an async SQLite read duplicating what `queryFn` already does, and the module-level Maps create hidden global state that must be manually cleared on sign-out.

| Item | File:Line | Class | Action |
|------|-----------|-------|--------|
| `memCache` (Map) + `warmed` (Set) — progress | [progressService.ts:22–23](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/progressService.ts#L22-L23) | Keep (load-bearing) | **Part 2 rewrite** — replace with `initialData` from direct sync read once DB is context-available |
| `warmMemCache` function — progress | [progressService.ts:99–106](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/progressService.ts#L99-L106) | Keep (load-bearing) | Same — collapses when memCache is removed |
| `memCache` / `warmed` — bestScores | [bestScoreService.ts:26–27](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/bestScoreService.ts#L26-L27) | Keep (load-bearing) | Same rewrite |
| `warmMemCache` function — bestScores | [bestScoreService.ts:71–78](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/bestScoreService.ts#L71-L78) | Keep (load-bearing) | Same |
| `statsCache` / `warmedStats` in cacheStore | [cacheStore.ts:15–17](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/store/cacheStore.ts#L15-L17) | Keep (load-bearing) | Same — only the **stats half** of `cacheStore.ts` is removable. The file must stay: `questionCacheBypassed` (L19) is actively used by `questionCache.ts` L39/64/109. |
| `warmMemCache` function — stats | [statsService.ts:98–107](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/services/statsService.ts#L98-L107) | Keep (load-bearing) | Same |
| Hook-level warm calls + `memData` plumbing | [useProgress.ts:34–49](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/hooks/useProgress.ts#L34-L49), [useLectureBestScores.ts:31–45](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts#L31-L45), [useStats.ts:25–38](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/hooks/useStats.ts#L25-L38) | Keep (load-bearing) | Simplify after memCache removal |
| Manual memCache clearing in `authStore` `signOut` | [authStore.tsx:170–174](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/store/authStore.tsx#L170-L174) | Keep (load-bearing) | Deletes with memCache |
| Manual memCache clearing in `onAuthStateChange` | [authStore.tsx:199–202](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/store/authStore.tsx#L199-L202) | Keep (load-bearing) | Deletes with memCache |

### 1.2 Dead/Legacy Keys, Flags, and Tables

| Item | File:Line | Class | Action |
|------|-----------|-------|--------|
| `migration_quarantine` table definition | [schema.ts:196–202](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/schema.ts#L196-L202) | **Needs schema migration** | Generate a `DROP TABLE migration_quarantine` Drizzle migration, remove from schema.ts |
| `migration_quarantine` in init SQL | [0000_init.sql:60–66](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/drizzle/0000_init.sql#L60-L66) | N/A (historical) | Leave — init SQL is immutable journal history |
| `async_migration_v1_done` comment in schema.ts | [schema.ts:178](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/schema.ts#L178) | **Delete now** | Stale comment referencing retired migrator |
| `async_migration_v1_done` as test fixture key | [metaRepository.test.ts:21–22](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/__tests__/metaRepository.test.ts#L21-L22) | **Delete now** | Replace with a generic key like `"test_key"`. Functional test, just a misleading name |
| Schema comment "legacy migrator idempotency" | [schema.ts:178](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/schema.ts#L178) | **Delete now** | Update comment to only document `question_cache_version` (which is active) |
| Schema comment "legacy AsyncStorage migration" | [schema.ts:191–194](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/schema.ts#L191-L194) | **Delete now** | Drops with table |
| `vacuumDatabase` `force` param doc "used once after the legacy migration" | [maintenance.ts:63](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/maintenance.ts#L63) | **Delete now** | Update JSDoc — the `force` param is still useful for post-migration-run vacuum, just not specifically "legacy migration" |

### 1.3 Legacy Shims

| Item | File:Line | Class | Action |
|------|-----------|-------|--------|
| Legacy localId detection (`isLegacy = item.localId.includes(".")`) | [syncStore.tsx:97–112](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/store/syncStore.tsx#L97-L112) | **Keep (grace period)** | Users who had queued items before the migration may still have `Date.now()-Math.random()` IDs in their `quiz_results` table. Keep for **2 more releases**, then delete. The shim is cheap (one `includes` check per queue item). |

### 1.4 Stale Tooling and Dead Files

| Item | File:Line | Class | Action |
|------|-----------|-------|--------|
| `fix-imports.js` | [fix-imports.js](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/fix-imports.js) (203 lines) | **Delete now** | One-time migration script from old `@/lib/`, `@/context/`, `@/hooks/` paths → feature-module paths. Job done. No runtime references. |
| `fix-cycles.js` | [fix-cycles.js](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/fix-cycles.js) (43 lines) | **Delete now** | One-time cycle-fix script. Never actually applied changes (`changed` is never set to `true` — the script has a bug at L20-21 where it reassigns `newContent` but never sets `changed = true`). Dead on arrival. |
| Root `constants/` directory | [constants/colors.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/constants/colors.ts), [constants/index.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/constants/index.ts) | **Delete now** | Zero imports from `@/constants` anywhere in `src/` or `app/`. The app uses `@/src/shared/constants/theme` exclusively. This is the pre-migration `@/constants/colors` that `fix-imports.js` was supposed to rewrite. |
| Empty `scripts/` directory | [scripts/](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/scripts) | **Delete now** | Empty directory |

### 1.5 Logic that Still Behaves AsyncStorage-Style

| Item | File:Line | Class | Action |
|------|-----------|-------|--------|
| `getQueue()` returns all pending rows, callers filter by `userId` in JS | [offlineQueue.ts:85–87](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/services/offlineQueue.ts#L85-L87) → filtered at [progressService.ts:111–112](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/progressService.ts#L111-L112), [bestScoreService.ts:108](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/bestScoreService.ts#L108), [statsService.ts:375](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/services/statsService.ts#L375), [statsService.ts:463](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/services/statsService.ts#L463), [syncStore.tsx:83](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/store/syncStore.tsx#L83) | **Part 2 rewrite** | Classic `getAllKeys`-style enumeration. `QueueRepository` already has `pendingCount(userId?)` — add `getPendingForUser(userId)` and use `WHERE user_id = ?` in SQL |
| `mergeQueuedScores` full-queue scan | [bestScoreService.ts:103–119](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/bestScoreService.ts#L103-L119) | **Part 2 rewrite** | Same — calls `getQueue()` then filters. Should accept userId-scoped data |
| `writeProgressCache` delete-all + re-insert | [progressService.ts:55–65](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/progressService.ts#L55-L65) | **Part 2 rewrite** | Replays the old "read-all/mutate/write-all" pattern in SQL. An `INSERT OR IGNORE` of the new ID would suffice for `optimisticallyMarkComplete`; the full replace is only needed for the server-fetch path |
| Per-service `clear*` functions (3 separate) + `clearAllUserCaches` | [progressService.ts:223–238](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/progressService.ts#L223-L238), [bestScoreService.ts:189–201](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/bestScoreService.ts#L189-L201), [statsService.ts:487–498](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/services/statsService.ts#L487-L498), [cacheUtils.ts:22–48](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/utils/cacheUtils.ts#L22-L48) | **Part 2 rewrite** | `clearAllUserCaches` already issues all 6 DELETEs in one transaction. The per-service `clear*` functions duplicate this and also manually clear memCache. Once memCache is removed, these collapse |

### 1.6 Duplicate Retention Purge

| Item | File:Line | Class | Action |
|------|-----------|-------|--------|
| `QueueRepository.purgeExpired()` — **dead in production** | [queueRepository.ts:116–128](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/repositories/queueRepository.ts#L116-L128) | **Delete or consolidate** | The production cold-start path (`maintenance.purgeExpiredSyncedResults`, raw SQL at [maintenance.ts:21–30](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/maintenance.ts#L21-L30)) duplicates this exact logic. `purgeExpired()` is called **only** from tests ([queueRepository.test.ts:94,102](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/__tests__/queueRepository.test.ts#L94)). Two implementations of the same 30-day retention = drift risk (e.g. the raw-SQL version adds `synced_at IS NOT NULL`, the Drizzle version does not). **Keep one.** Prefer: make `maintenance` call `repo.purgeExpired()` and drop the raw SQL, so retention lives in one Drizzle method. |

---

## Part 2 — Logic That Should Be Re-Architected

### 2.1 Replace `warmMemCache` Pattern with Direct `initialData` Reads

| | |
|---|---|
| **Files** | [progressService.ts:22–106](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/progressService.ts#L22-L106), [bestScoreService.ts:26–78](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/bestScoreService.ts#L26-L78), [statsService.ts:98–107](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/services/statsService.ts#L98-L107), [cacheStore.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/store/cacheStore.ts) (stats half only — keep `questionCacheBypassed`), [useProgress.ts:34–49](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/hooks/useProgress.ts#L34-L49), [useLectureBestScores.ts:31–45](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts#L31-L45), [useStats.ts:22–38](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/hooks/useStats.ts#L22-L38), [authStore.tsx:14–21,170–174,199–202](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/store/authStore.tsx#L14-L21) |
| **Current behavior** | Each service maintains a module-level `Map` + `Set` manually warmed from SQLite. Hooks fire a side-effecting `warmMemCache()` in the render body (not in a `useEffect`), then read `memCache.get(userId)` synchronously to feed RQ's `initialData`. On sign-out, `authStore` manually clears all six module-level variables. |
| **Proposed rewrite** | Export a pure async `readCache(userId)` from each service. In the hook, use React Query's `placeholderData` fed by a **Zustand slice** that the `queryFn` populates on first success (or on the `onSuccess` callback). Alternatively — and this is the cleaner path — use `useDatabase()` from `provider.tsx` to get the DB instance synchronously in the component, then call a synchronous helper that wraps `db.$client.getAllSync(...)` (expo-sqlite sync API) for the `initialData` read. This removes the fire-and-forget `warmMemCache()` entirely. |
| **Expected benefit** | Eliminates 6 module-level globals, the `warmed` bookkeeping, `cacheStore.ts` (stats half), and the manual clearing in `authStore`. Lines removed: ~80–100. |
| **Risk** | Medium. The sync driver's `getAllSync()` runs on the JS thread; if `progress` has >10K rows per user this could cause a micro-jank. Profile on a 2 GB RAM Android device first. For safety, limit `initialData` to a `COUNT(*)` + `WHERE lecture_id IN (visible lectures)` instead of a full table scan. |
| **Effort** | Medium (1–2 days). Touch 8 files, update 3 hooks, delete or gut `cacheStore.ts`, update `authStore` sign-out. |

### 2.2 Move Raw SQL to Drizzle Query Builder

| | |
|---|---|
| **Files** | [progressService.ts:30–33,56–63,225–228](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/progressService.ts#L30-L33), [bestScoreService.ts:34–37,52–66,191–194](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/bestScoreService.ts#L34-L37), [statsService.ts:64–67,79–84,489–492](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/services/statsService.ts#L64-L67), [accessService.ts:21–30,55–71](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/accessService.ts#L21-L30), [useMyPurchases.ts:15–25,47–63](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts#L15-L25), [cacheUtils.ts:27–33](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/utils/cacheUtils.ts#L27-L33) |
| **Current behavior** | These services call `db.$client.getAllAsync("SELECT ...")` and `db.$client.runAsync("DELETE ...")` with hand-written SQL strings and manual type annotations (`<{ lecture_id: string }>`). |
| **Proposed rewrite** | For services with only 2–3 simple queries (progress, bestScores, stats, access, purchases), create thin repository classes or convert existing `readCache`/`writeCache` functions to use the Drizzle schema objects: `db.select().from(progress).where(eq(progress.userId, userId))`. For `writeProgressCache`'s delete+insert loop, use Drizzle's `db.delete(progress).where(...)` + `db.insert(progress).values([...])`. |
| **Re-assess plan §2 #7** | The plan said "repositories only for 3 domains (hierarchy, questions, queue)." Now that 5 more services use raw SQL with the same patterns, this decision should be revisited. **Recommendation**: don't create 5 new Repository classes (over-abstraction for single-consumer queries). Instead, convert the raw SQL calls in-place to Drizzle query builder calls. The services already import `getDb()` — they just need to import the schema tables too. This gives type safety without the ceremony of a class per table. |
| **Expected benefit** | Compile-time type safety for all column names, automatic schema drift detection, eliminates 30+ hand-typed SQL strings. |
| **Risk** | Low. One-to-one mechanical rewrite. The Drizzle query builder generates identical SQL. |
| **Effort** | Low–Medium (0.5–1 day). Mechanical, no behavioral change. |

### 2.3 Add `userId` Parameter to `getQueue()`

| | |
|---|---|
| **Files** | [offlineQueue.ts:85–87](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/services/offlineQueue.ts#L85-L87), [queueRepository.ts:61–68](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/repositories/queueRepository.ts#L61-L68), all callers (5 sites) |
| **Current behavior** | `getQueue()` calls `repo.getPending()` which returns ALL pending rows. Every caller then filters: `queue.filter(q => q.userId === userId)`. |
| **Proposed rewrite** | Add `getPendingForUser(userId: string)` to `QueueRepository` using `.where(and(eq(quizResults.status, "pending"), eq(quizResults.userId, userId)))`. Add `getQueueForUser(userId)` to `offlineQueue.ts`. Update callers. **`syncStore` can switch to it too** — its flush loop already filters to the current user (`syncStore.tsx:83`), so no caller needs the unscoped `getQueue()` in production; keep the unscoped repo method only for tests. |
| **Expected benefit** | Pushes filtering to SQLite's indexed `user_id` column, eliminates N JS-side array scans per render cycle. |
| **Risk** | Very low. Additive change. |
| **Effort** | Low (1–2 hours). |

### 2.4 Quiz Cache Pre-Load Fast Path

| | |
|---|---|
| **Files** | [useQuizSession.ts:30–47](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts#L30-L47), [useQuiz.ts:14–48](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/quiz/hooks/useQuiz.ts#L14-L48) |
| **Current behavior** | `useQuizSession` fires `loadQuestionsFromCache(lectureId)` in a `useEffect` to populate `cachedQuestions` state, which is then passed to `useQuizQuestions(lectureId, cachedQuestions)` as `initialData`. The RQ hook's own `queryFn` also falls back to `loadQuestionsFromCache` on network failure. So the same cache read runs twice on cold mount. |
| **Proposed rewrite** | **Keep the fast path** but simplify: move the `loadQuestionsFromCache` call into `useQuizQuestions` as `initialData` via a synchronous read (if the sync API is used), or via `placeholderData: () => queryClient.getQueryData(["quiz", lectureId, ...])`. The double read is harmless (SQLite is local, ~1ms) but the extra state (`cachedQuestions`, `cacheChecked`) adds complexity. |
| **Expected benefit** | Removes ~15 lines of state management from `useQuizSession`. |
| **Risk** | Low. The current approach works; this is purely a simplification. |
| **Effort** | Low (1–2 hours). |

### 2.5 Consolidate `clear*` Functions

| | |
|---|---|
| **Files** | [clearAllUserCaches](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/utils/cacheUtils.ts#L22-L48), [clearProgressCache](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/progressService.ts#L223-L238), [clearBestScoreCache](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/bestScoreService.ts#L189-L201), [clearStatsCache](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/services/statsService.ts#L487-L498) |
| **Current behavior** | `clearAllUserCaches` deletes from 6 tables in a transaction. Each per-service `clear*` function does the same DELETE plus manually clearing module-level memCache/warmed Sets. **Callers: `authStore.signOut()` (L167) AND `AccountActions.tsx` clear-history flow (L73–78)** — the latter calls `clearStatsCache` + `clearProgressCache` + `clearBestScoreCache` + `clearQueueForUser` individually, i.e. it re-implements `clearAllUserCaches` by hand. |
| **Proposed rewrite** | Once memCache is removed (§2.1), the per-service `clear*` functions become trivial wrappers around a single DELETE. Collapse them into `clearAllUserCaches` as the single entry point. Delete `clearProgressCache`, `clearBestScoreCache`, `clearStatsCache` exports and **replace the `AccountActions.tsx` L73–78 `Promise.all` with a single `clearAllUserCaches(uid)` call** (its `clearQueueForUser(uid)` is already covered by `clearAllUserCaches`). |
| **Expected benefit** | Single place to reason about user-data purging. Eliminates 3 exports, ~50 lines, and the hand-rolled purge in `AccountActions`. |
| **Risk** | Very low. Only `authStore.signOut` and `AccountActions` call them; both are already covered by `clearAllUserCaches`. |
| **Effort** | Low (30 min). Blocked on §2.1 completing first. |

### 2.6 Maintenance Cadence Assessment

| | |
|---|---|
| **Files** | [maintenance.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/maintenance.ts), [provider.tsx:39–46](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/provider.tsx#L39-L46) |
| **Current behavior** | Cold start: `purgeExpiredSyncedResults` (30-day retention on `status='synced'` rows) + `PRAGMA optimize` (hourly debounce). VACUUM: monthly, not on cold start. |
| **Assessment** | ✅ **Correct**, with two caveats. (a) The retention purge logic is **duplicated** — raw SQL here vs `QueueRepository.purgeExpired` (test-only). See §1.6. (b) `vacuumDatabase` is never called in production — the force-VACUUM was only used by the now-deleted legacy migrator. It should be wired to the monthly cadence (e.g., called in `runColdStartMaintenance` with the throttle check). Currently, VACUUM **never runs** in production. |
| **Proposed fix** | Add `vacuumDatabase(db)` (without `force`) to `runColdStartMaintenance` after `optimizeDatabase`. The monthly throttle inside `vacuumDatabase` ensures it won't run often. |
| **Risk** | Very low. The function already has its own throttle. |
| **Effort** | 5 minutes — one function call. |

### 2.7 Hot Query Indexes

| | |
|---|---|
| **Current indexes** | `quiz_results(status, created_at)` — covers `getPending` (status filter + createdAt order) and retention purge (status + syncedAt, but `syncedAt` isn't in the index). `quiz_results(user_id)` — covers `clearForUser`. |
| **Missing** | The retention purge queries `WHERE status = 'synced' AND synced_at < ?`. The compound index `(status, created_at)` doesn't cover `synced_at`. Consider `(status, synced_at)` or relying on the existing index (which gets status selectivity, then scans synced_at — likely fine for <1000 synced rows). |
| **Verdict** | **No action needed now.** The retention purge runs once per cold start. Even a full scan of synced rows is <10ms for typical user volumes (<500 rows). Add `(status, synced_at)` only if the row count grows significantly. |

---

## Part 3 — Open Architecture Horizons

### Priority Table

| ID | Category | What | Value | Effort | Risk | Dependencies | When |
|----|----------|------|-------|--------|------|-------------|------|
| **H-01** | Cleanup | Delete dead files (`fix-imports.js`, `fix-cycles.js`, root `constants/`, empty `scripts/`) | Reduced confusion | 5 min | None | None | **P0 — now** |
| **H-02** | Schema | DROP `migration_quarantine` table via Drizzle migration | Clean schema | 15 min | Low (standard migration) | None | **P0 — now** |
| **H-03** | Schema | Update stale comments re: `async_migration_v1_done` + quarantine in schema.ts; also `maintenance.ts:89–90` module doc ("VACUUM ... invoked once post-migration and then monthly by `vacuumDatabase`") — stale, nothing calls it today | Clean docs | 5 min | None | None | **P0 — now** |
| **H-04** | Schema | Update metaRepository.test.ts to use non-legacy key name | Clean tests | 5 min | None | None | **P0 — now** |
| **H-05** | Bug fix | Wire `vacuumDatabase(db)` into `runColdStartMaintenance` | VACUUM actually runs | 5 min | Very low | None | **P0 — now** |
| **H-06** | SQL | Add `getQueueForUser(userId)` to offlineQueue, push filtering to SQL (all 5 callers incl. syncStore) | Perf, clean code | 2 hrs | Very low | None | **P0 — now** |
| **H-06b** | SQL | De-duplicate retention purge: make `maintenance` call `QueueRepository.purgeExpired()`, drop the raw-SQL twin | One retention path, no drift | 15 min | Low (both already filter `synced_at IS NOT NULL` — behavior is identical) | None | **P0 — now** |
| **H-07** | Type safety | Convert raw `$client.getAllAsync` / `$client.runAsync` calls to Drizzle query builder in 5 services | Type safety, schema drift protection | 0.5–1 day | Low | None | **P1 — next sprint** |
| **H-08** | Architecture | Replace `warmMemCache` pattern with synchronous `initialData` reads from DB context | Eliminate 6 globals, ~100 lines, simplify sign-out | 1–2 days | Medium (profile on low-end) | H-07 (recommended order) | **P1 — next sprint** |
| **H-09** | Architecture | Consolidate per-service `clear*` functions into `clearAllUserCaches` | Single purge entry point | 30 min | Very low | H-08 | **P1 — after H-08** |
| **H-10** | Simplify | Simplify quiz cache fast-path double-read in `useQuizSession` | Remove ~15 lines of state | 1–2 hrs | Low | None | **P1 — next sprint** |
| **H-11** | Reactivity | Drizzle `useLiveQuery` for progress/bestScores screens | Reactive UI without manual invalidation | 1 day | Medium (sync driver maturity) | H-07 | **P2 — later** |
| **H-12** | Data | Recompute `user_stats` from `quiz_results` locally | Offline stats accuracy without server RPC | 2–3 days | Medium (correctness) | H-07 | **P2 — later** (plan §4 exception documented) |
| **H-13** | Search | FTS5 question search | Feature unlock | 1–2 days | Low | None | **P2 — deferred** (plan §4) |
| **H-14** | Security | Per-user encrypted MMKV instance (`createUserStorage(userId)`) | Data isolation on shared devices | 0.5 day | Low | None | **P2 — deferred** (plan §5, §12) |
| **H-15** | Feature | Bookmarks / favorites / wrong-questions tables | Feature unlock | 2–3 days | Low | H-07 | **P2 — deferred** (plan §12) |
| **H-16** | Security | Biometric unlock with MMKV encryption-key in SecureStore | Premium feature | 1–2 days | Medium (platform variance) | H-14 | **P2 — deferred** (plan §12) |
| **H-17** | MMKV | Reactive hooks / change listeners for theme & profile | Live sync across screens | 0.5 day | Low | None | **P2 — later** |
| **H-18** | Perf | Measurement checklist: sync-driver blocking, low-end Android profiling | Confidence | 1 day (profiling) | None | None | **P1 — next sprint** |
| **H-19** | Architecture | Persist React Query cache to SQLite | Instant resume across cold starts | 2 days | Medium (stale data risk) | H-07 | **P2 — later** (keep RQ as server-state only for now) |
| **H-20** | Legacy | Remove syncStore legacy-ID shim (`isLegacy = localId.includes(".")`) | Clean code | 5 min | Low (grace period needed) | 2 release cycles | **P2 — 2 releases from now** |

### P2 Horizon Details

**SQLite — `useLiveQuery` (H-11):** Drizzle's `useLiveQuery` (from `drizzle-orm/expo-sqlite`) gives reactive subscriptions to query results. This would let progress cards and best-score stars update automatically when `quiz_results` rows are inserted, without `queryClient.invalidateQueries()`. However: (a) the sync driver version is documented as experimental, and (b) it only fires on local writes, not on background sync from Supabase. Net: useful for optimistic local state, but RQ invalidation is still needed for server reconciliation. **Verdict: P2, wait for driver stability.**

**SQLite — `user_stats` recompute (H-12):** Plan §4 documents `user_stats.payload` as a normalization exception — a JSON blob cached from the server RPC. With all `quiz_results` now local, computing stats from `SELECT` aggregates is feasible. The cost depends on row count; for <500 quiz results per user, a `GROUP BY` with window functions is sub-10ms. The complexity is in the streak calculation (consecutive-day logic that currently runs in `applyPendingStats`). **Verdict: P2, implement when offline stats accuracy becomes a user-facing issue.**

**RQ Cache to SQLite (H-19):** Persisting React Query's cache to SQLite (e.g., via `@tanstack/query-sync-storage-persister`) would give instant cold-start data for all queries. However, Harvi already provides per-domain SQLite caches + `initialData` — this would be a **second persistence layer** on top. **Verdict: P2, keep RQ as server-state-only. The existing per-domain caches already solve the cold-start problem.**

**Sync-driver blocking risk (H-18):** The expo-sqlite sync driver runs SQLite on the JS thread. For the current query shapes (point reads by user_id, small result sets), this is fine. The risk surfaces if: (a) the questions table exceeds ~50K rows (bulk pre-download), or (b) a full-table scan runs during an animation. **Verdict: P1, measure. Profile `loadQuestionsFromCache` for a subject with 200+ questions on a low-end Android (2 GB RAM, Hermes). If any read exceeds 16ms, consider the async driver or offloading to a background query.**

---

## Top 5 Recommended Actions

1. **Delete dead files** (H-01): `fix-imports.js`, `fix-cycles.js`, root `constants/`, empty `scripts/`. Zero risk, immediate hygiene.

2. **Wire VACUUM into cold-start maintenance** (H-05): Currently, `vacuumDatabase` is defined but never called in production. One line adds monthly VACUUM.

3. **Add `getQueueForUser(userId)` and push filtering to SQL** (H-06): Eliminates 5 sites of in-JS `Array.filter()` on queue data (including `syncStore.flush`, which already filters to the current user). Low effort, clean architectural alignment.

4. **Convert raw SQL to Drizzle query builder** (H-07): Mechanical rewrite of ~30 SQL strings in 5 services. Unlocks schema-safe queries and enables P2 work (useLiveQuery, stats recompute).

5. **Generate `DROP TABLE migration_quarantine` migration** (H-02): Clean schema, eliminates a table that has been empty since the legacy migrator was retired.

*Honorable mention —* **H-06b (duplicate retention purge):** two implementations of the same 30-day purge (`maintenance.ts` raw SQL vs `QueueRepository.purgeExpired`, test-only). Collapsing to one Drizzle method removes drift risk in ~15 min.

---

## Implementation Plans for Top P0 Items

### Plan: H-01 + H-03 + H-04 — Dead File & Stale Comment Cleanup

**Goal:** Remove dead files and update stale documentation artifacts.

**Files to touch:**
- **DELETE** `artifacts/mobile/fix-imports.js`
- **DELETE** `artifacts/mobile/fix-cycles.js`
- **DELETE** `artifacts/mobile/constants/colors.ts`
- **DELETE** `artifacts/mobile/constants/index.ts`
- **DELETE** `artifacts/mobile/scripts/` (empty dir)
- **MODIFY** [`schema.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/schema.ts) L176–180: Update `appMeta` JSDoc to remove `async_migration_v1_done` reference; keep `question_cache_version` documentation
- **MODIFY** [`metaRepository.test.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/__tests__/metaRepository.test.ts) L21–24: Replace `"async_migration_v1_done"` with `"test_timestamp_key"` or similar

**Tests:** `npm test -- --testPathPattern metaRepository` (existing test, updated key name)

**Verification:**
```bash
# Confirm no remaining imports to deleted files
cd artifacts/mobile
npx tsc -p tsconfig.json --noEmit
grep -r "fix-imports\|fix-cycles\|@/constants" src/ app/ --include="*.ts" --include="*.tsx"
```

---

### Plan: H-02 — DROP `migration_quarantine` Table

**Goal:** Remove the empty legacy table from the schema via a proper Drizzle migration.

**Files to touch:**
- **MODIFY** [`schema.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/schema.ts): Delete L189–202 (the `migrationQuarantine` export and its JSDoc)
- **RUN** `npx drizzle-kit generate` → generates `drizzle/0001_drop_migration_quarantine.sql` with `DROP TABLE migration_quarantine;`
- **VERIFY** `drizzle/migrations.js` is regenerated to include the new migration

**Tests:** `npm test` — all existing tests pass (no test references `migrationQuarantine`)

**Verification:**
```bash
cd artifacts/mobile
npx drizzle-kit generate
npx tsc -p tsconfig.json --noEmit
npm test
```

**Risk:** The Drizzle migration runs on next app cold start. Existing users get the table dropped — no data loss (table is always empty). New installs: `0000_init.sql` still creates it (immutable journal), `0001_*.sql` immediately drops it. This is standard Drizzle migration behavior.

---

### Plan: H-05 + H-06 — VACUUM Fix + Queue Filtering

**Goal:** Wire monthly VACUUM into cold-start maintenance. Add user-scoped queue reads to push filtering to SQL.

**Files to touch:**

#### H-05: VACUUM
- **MODIFY** [`maintenance.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/maintenance.ts) `runColdStartMaintenance`: Add `vacuumDatabase(db)` call after `optimizeDatabase(db)`, wrapped in try/catch
- **MODIFY** [`maintenance.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/maintenance.ts) L63: Update JSDoc from "used once after the legacy migration" to "set to `true` to bypass the monthly throttle"

#### H-06: Queue filtering
- **MODIFY** [`queueRepository.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/db/repositories/queueRepository.ts): Add `getPendingForUser(userId: string)` method using `.where(and(eq(quizResults.status, "pending"), eq(quizResults.userId, userId)))`
- **MODIFY** [`offlineQueue.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/services/offlineQueue.ts): Add `getQueueForUser(userId: string): Promise<PendingQuizResult[]>` that delegates to `repo.getPendingForUser(userId)`
- **MODIFY** [`progressService.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/progressService.ts) L111–112: Replace `getQueue()` + `.filter(q => q.userId === userId)` with `getQueueForUser(userId)`
- **MODIFY** [`bestScoreService.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/learn/services/bestScoreService.ts) L107–108: Same
- **MODIFY** [`statsService.ts`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/features/stats/services/statsService.ts) L374–375, L462–463: Same
- **MODIFY** [`syncStore.tsx`](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/src/shared/store/syncStore.tsx) L82–83: Same — `flush` already filters `fullQueue.filter((item) => item.userId === user.id)`, so `getQueueForUser(user.id)` is a drop-in; drop the manual filter

**Tests to add:**
- `queueRepository.test.ts`: add a test case `"getPendingForUser returns only that user's rows"`

**Verification:**
```bash
cd artifacts/mobile
npm test
npx tsc -p tsconfig.json --noEmit
```
