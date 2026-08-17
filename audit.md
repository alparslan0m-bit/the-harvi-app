# Senior-Level SQLite + MMKV + Offline Architecture Audit

**Project:** Harvi — React Native / Expo / SQLite / offline-first
**Scope:** Whole-repo, line-by-line audit of the actual implementation (not docs)
**Method:** Read every storage/data-flow file (DB layer, repositories, services, hooks, stores, sync engine, auth lifecycle, tests, Drizzle migrations, Expo config), and verified live behaviors against the installed library code (`expo-sqlite@16.0.10`, `drizzle-orm@0.45.2`). Ran `pnpm typecheck` and `pnpm test`.
**Date:** 2026-08-17

---

## 1. Repository Reconnaissance — Mental Model

### SQLite layer
- `src/db/client.ts` — singleton Drizzle instance over `openDatabaseAsync("harvi.db")`, PRAGMA tuning once per connection (WAL, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout=5000`).
- `src/db/provider.tsx` — `DatabaseProvider` gates the tree on `getDb()` resolution; runs cold-start maintenance after migrations.
- `src/db/migrate.ts` — `useMigrations` from `drizzle-orm/expo-sqlite/migrator`.
- `src/db/maintenance.ts` — retention purge, debounced `PRAGMA optimize`, monthly `VACUUM`.
- `src/db/rawClient.ts` — driver-agnostic raw client surface (expo-sqlite `$client` or better-sqlite3 test double).
- `src/db/schema.ts` — 11 tables: `hierarchy_years/modules/subjects/lectures`, `questions`, `progress`, `best_scores`, `bookmarks`, `quiz_results`, `user_stats`, `access_map`, `purchases`, `app_meta`.
- `src/db/repositories/` — `HierarchyRepository`, `QuestionRepository`, `QueueRepository`, `MetaRepository` (Drizzle + raw SQL mix).
- `drizzle/` — migrations `0000_init`, `0001_icy_ultron` (drops legacy `migration_quarantine`), `0002_bookmarks`.

### MMKV
- `src/shared/storage/mmkv.ts` — `createMMKV({ id: "harvi-default" })`, typed accessors: theme, avatar, displayName, `quiz.fkcol`.

### SecureStore
- `src/shared/services/supabase.ts` — chunked SecureStore adapter for Supabase session tokens (2 KB iOS limit workaround).

### React Query / Zustand / offline
- Root `QueryClient`: `gcTime` 24h, `networkMode: offlineFirst`, `retry: 1` (`app/_layout.tsx`).
- Stores: `authStore` (session + signOut + OAuth), `syncStore` (isOnline/isSyncing/pendingCount + flush engine + NetInfo), `purchaseStore` (RevenueCat), `themeStore` (MMKV-backed), `cacheStore` (`questionCacheBypassed` only).
- Offline queue: `quiz_results` rows with `status='pending'`, flushed to Supabase by `syncStore.flush`.

---

## 2. SQLite Deep Audit

### Initialization — correct
- Singleton + promise dedup (`client.ts:42-59`) prevents double-open and access-before-init; `resetDb()` is test-only. `DatabaseProvider` throws on open failure and renders children only after the DB is ready. PRAGMAs applied exactly once per connection. Restart behavior is idempotent (Drizzle tracks applied migrations in its own journal).

### Driver correctness — verified against installed libraries
- `expo-sqlite@16` unifies `SQLiteDatabase` with both sync and async API families; `openDatabaseAsync` returns a sync-capable handle. Therefore `db.$client.getAllSync/getFirstSync` calls and drizzle's sync driver + `useLiveQuery` are type-correct and functional. The `Database = ExpoSQLiteDatabase<...> & { $client: SQLite.SQLiteDatabase }` annotation is accurate.

### The transaction bug — P1 (see Findings)
- Drizzle's **sync** `transaction()` (`drizzle-orm/expo-sqlite/session.js:31-44`) is synchronous: `BEGIN` → `const result = transaction(tx)` → `COMMIT`. It never awaits an async callback. `await db.transaction(async (tx) => { await A; await B; })` runs **A inside** the transaction, then `COMMIT` fires immediately after the first `await` yields, and **B runs after commit in auto-commit mode**. Errors in B are not caught/rolled back. Five call sites are affected (see Findings P1-3).

### Schema — mostly sound
- Normalized hierarchy, indexed FKs (`hierarchy_*_idx`, `questions_lecture_id_idx`, `quiz_results_status_created_at_idx`, `quiz_results_user_id_idx`, `purchases_user_id_idx`, `bookmarks_user_id_idx`), composite PKs for user-scoped tables, `CHECK` constraints on `quiz_results.status` and `access_map.item_type`.
- `bookmarks` table has **zero consumers** (dead — P3).
- `user_stats` uses a single JSON `payload` column — documented normalization exception; validated with Zod at the boundary.
- Migration artifacts: `migration_quarantine` created in `0000` and dropped in `0001` — harmless legacy, correctly handled.

### Queries
- Queue reads are scoped + ordered; retention purge is scoped to `synced` + `synced_at IS NOT NULL`. No N+1 problems. No full-table scans in hot paths except the sync render-path reads (see Performance).

---

## 3. MMKV Deep Audit

| Key | Data | Tier verdict | Owner | Cleared on logout? |
|---|---|---|---|---|
| `theme` | Device preference | Correct — MMKV is right tier | global | n/a (device-level) |
| `avatar` | **User profile** | **Wrong — not user-scoped** | global | **No — leaks to next user** (P1-5) |
| `displayName` | **User profile** | **Wrong — not user-scoped** | global | **No — leaks to next user** (P1-5) |
| `quiz.fkcol` | Schema-detection hint | Acceptable (one scalar) | global | No (harmless) |

- MMKV is **not** acting as an accidental second database for relational data — good. But it **is** an accidental second home for user profile state, and `mmkv.clearAll()` (`mmkv.ts:40`) is never called anywhere (P3).
- Serialization safety: values are plain strings; no JSON blobs that could crash on corrupt reads. `getTheme` casts without validation but defaults safely downstream.

---

## 4. Data Ownership / Source-of-Truth Matrix

| Data | Remote | Local | Source of truth | Writable locally | Sync required |
|---|---|---|---|---|---|
| Questions (bank) | Supabase `questions` | `questions` | Remote (content) | Yes (offline download) | No (pull-only) |
| Hierarchy | content tables | `hierarchy_*` | Remote | Yes (cache) | No |
| Progress (completed) | `quiz_results` | `progress` | Remote, derived | Yes (optimistic) | Indirect (via quiz_results) |
| Best scores | `quiz_results` | `best_scores` | Remote, derived | Yes (optimistic) | Indirect |
| Quiz results / queue | `quiz_results` | `quiz_results` (pending) | Remote | Yes (offline enqueue) | **Yes (push)** |
| Stats | `user_stats` + RPC | `user_stats.payload` | Remote, derived | Yes (cache) | No |
| Purchases / access | `purchases` + RPC | `access_map`, `purchases` | Remote | No | No |
| Profile (name/avatar) | `profiles` (exists, unused) | **MMKV only** | Local-only today | Yes | Should be remote — **disconnected** (P1-5) |
| Theme | — | MMKV | Local | Yes | No |
| Auth / session | Supabase auth | SecureStore | Remote | No | — |
| Offline queue | — | `quiz_results` (pending) | Local | Yes | Yes |
| `question_cache_version` | — | `app_meta` | Local | Yes | No |

**Competing source-of-truth flags**
1. **Progress** is derived from `quiz_results` server-side but materialized locally and updated optimistically; the online quiz path never writes it (P1-8) — the two can disagree until sync.
2. **Profile** has a server `profiles` table and a local MMKV blob that are **entirely disconnected**.
3. **Best score** is duplicated across `best_scores`, the pending-queue merge, and server `quiz_results` — resolved by `max()`, so convergent (safe).

---

## 5. Data Flow Audit

### Read flow
`UI → React Query (initialData from sync SQLite read) → queryFn → NetInfo gate → Supabase → write-back to SQLite → UI` — structurally sound; the render-path sync reads are the weak point (see Performance).

### Write flow (quiz completion)
- Offline: `UI → enqueueQuizResult (atomic INSERT) → optimisticallyMarkComplete + optimisticallyUpdateBestScore → syncStore.flush → Supabase → markSynced → RQ invalidate`.
- Online: `UI → direct INSERT (client UUID) → optimisticallyUpdateBestScore only → RQ invalidate`. **Progress is not written** (P1-8).
- Online-with-failed-insert: falls back to queue with the same session UUID → flush re-inserts → idempotent via `23505`. Correct.

### Auth flow
- `signOut`: per-user SQLite purge (`clearAllUserCaches`) → `supabase.auth.signOut()` → `useCacheStore.clearAll()`. **MMKV profile keys and React Query caches survive** (P1-5, P1-7).
- Remote sign-out (`SIGNED_OUT` via `onAuthStateChange`) only clears `useCacheStore` — user SQLite rows remain (they are user-scoped, so no cross-user read leak; orphaned storage only).

### App restart flow
`cold start → DatabaseProvider opens DB → migrations → maintenance (fire-and-forget) → AuthProvider restores session → SyncProvider refreshCount/flush → screens read SQLite sync → UI`. Sound, except the dead live-query path (P1-4) leaves progress/best-score UI stale until remount/restart.

---

## 6. Caching Architecture Audit

| Layer | Caches | Lifetime | Invalidation | Issues |
|---|---|---|---|---|
| SQLite | hierarchy, questions, progress, best_scores, user_stats, access_map, purchases, queue | Persistent | Replace-on-fetch; purge on logout (user tables) | Non-atomic replaces (P1-3); content cache not purged on logout (P1-7) |
| MMKV | theme, avatar, displayName, fkcol | Persistent | Never | Profile keys not user-scoped/cleared (P1-5) |
| React Query | `["hierarchy"]`, `["quiz",lectureId,v]`, `["stats",uid]`, `["progress_sync",uid]`, `["lectureBestScores_sync",uid]`, `["content_access",uid]`, `["my_purchases",uid]` | gcTime 24h (quiz 5m) | invalidate on purchase/sync/quiz-end | Not cleared on logout; `["quiz"]`/`["hierarchy"]` persist across users (P1-7); invalidation keys don't match the `*_sync` queries (P1-4) |
| Zustand | questionCacheBypassed, auth, sync status | Session | clearAll on logout | Dead doc comment (P3) |

Duplicate-cache check: no same-state duplication between SQLite and MMKV (except the profile split, P1-5). `user_stats` snapshot + live queue merge is intentional and consistent.

---

## 7. React Query Audit

- Server state vs local persistence is **correctly separated**: RQ is the transport/cache, SQLite is the persistent mirror.
- Query keys are mostly stable and correctly scoped (`["stats", uid]`, `["content_access", uid]`, `["my_purchases", uid]`). `["hierarchy"]` and `["quiz", lectureId, version]` are intentionally global (content).
- `initialData`/`initialDataUpdatedAt` usage is reasonable (stats uses "11 min stale" to force refresh; quiz uses `0`).
- **Confusion found:** `useProgress`/`useLectureBestScores` run a background `useQuery` whose result is **discarded** — the UI reads only `useLiveQuery`, which never fires (P1-4). The invalidation calls in `flush` (`syncStore.tsx:145-146`) and `useQuizSession` (`useQuizSession.ts:185-187`) target `["progress"]`/`["lectureBestScores"]`, which do **not** prefix-match the `["progress_sync",…]`/`["lectureBestScores_sync",…]` keys — so nothing ever refreshes those screens live.

---

## 8. Offline-First Audit

**Correct:**
- Queue = `quiz_results` rows with `status='pending'`, oldest-first, user-scoped reads (`getPendingForUser`), atomic INSERT enqueue.
- Flush is sequential with a 10s per-item timeout; duplicate handling via `23505 → markSynced`; legacy-ID shim (`localId.includes(".")`) is correct; failures preserve the queue; `removeSynced` is a single UPDATE.
- Retention purge scoped to `synced` rows only; pending rows are never auto-deleted.
- Stats double-count prevention filters pending rows already present in server `recent_results` (`statsService.ts:467-468`).

**Problems:**
- Flush guard is per-hook-instance, not global (P2-9).
- No permanent-failure disposition: a persistent non-duplicate error (e.g., unrecoverable token refresh) stalls the queue indefinitely; sign-out deletes pending results (documented, but no recovery path) (P1, in Offline Verdict #4).
- Empty-user edge: `enqueueQuizResult` with `user?.id ?? ""` can create rows that can never sync and are never purged (F.3).

---

## 9. Authentication + User Isolation

- **SQLite user tables:** logically isolated (all reads/writes scoped by `user_id`) and physically purged on explicit sign-out — correct.
- **MMKV profile:** NOT isolated — global keys survive logout and leak to the next user (P1-5).
- **Content caches (`questions`, `hierarchy`) and RQ quiz/hierarchy caches:** survive logout; a subsequent user on a shared device can take offline quizzes for content they do not own (P1-7).
- **SecureStore tokens:** user-scoped by Supabase storage keys; no leak found.
- Pending-sync-at-logout: warned in UI and intentionally purged; no cross-user flush (flush is user-scoped).

---

## 10. Concurrency / Race Condition Audit

- **Double-init:** prevented by the `dbPromise` singleton pattern. Correct.
- **`db.transaction` async break** (P1-3): statements after the first `await` run outside the transaction → interleavable delete/insert sequences (e.g., two `writeCache` calls can interleave and lose an optimistic best-score update).
- **`optimisticallyUpdateBestScore`** is a non-atomic read-modify-write → lost-update window vs concurrent `fetchBestScores.writeCache` (P2-11).
- **Flush concurrency:** `flushing` ref is per `useSyncActions()` instance (SyncProvider + each quiz session) → two flush loops possible (P2-9); saved by idempotency.
- **Logout/sync race:** flush returns early when `user` is null; `markSynced` on rows deleted by logout affects 0 rows. Safe.
- **Auth-change race (quiz enqueue with `user` null):** can produce permanently-orphaned pending rows (F.3).
- **Render-phase `setQuestions` in `useQuizSession`** (`useQuizSession.ts:41-44`): guarded by `!questions`, so not an infinite loop, but fragile React-19 derived-state pattern.

---

## 11. Performance Audit

Highest-risk execution paths (all are synchronous JS-thread I/O on render hot paths):

1. **`useQuiz.ts:18` → `loadQuestionsFromCacheSync`** — reads the full lecture question bank and `JSON.parse`s every `options` blob **on every render** of the quiz screen (including each answer selection). Worst offender on low-end Android; paid even by fully-online users.
2. **`useStats.ts:21` → `readCacheSync`** — sync read + full `JSON.parse` + Zod `safeParse` of the whole `user_stats` payload **on every render** of Stats and Mastery screens.
3. **`useLiveQuery` initial execution** (sync) on mount of `useProgress`/`useLectureBestScores` — moderate, bounded.
4. Drizzle query-builder calls are sync by driver design, but each is small; bulk writes correctly route through `withExclusiveTransactionAsync`/raw chunked SQL.

Conclusion: not safe to leave as-is; these must be memoized/hoisted out of the render path or converted to async reads feeding `placeholderData`.

---

## 12. Error Handling Audit

- **Network errors:** caught and fall back to cache (progress/bestScores/stats/access/hierarchy/purchases) — correct.
- **Auth errors in flush:** break the loop and back off; no destructive deletion — correct, but no permanent-failure path.
- **RLS/duplicate errors:** `23505` treated as success (markSynced) — correct given idempotent UUIDs.
- **Timeout races (`Promise.race`):** a request that actually succeeded but whose response timed out leaves the item pending; the next flush hits `23505` and marks it synced — no data loss. Correct.
- **SQLite errors:** most cache writes are `try/catch` best-effort with `console.warn` — acceptable for caches, but the access-map replace (P1-3) can silently wipe access → locked modules offline.
- **The `db.transaction` async rejections are unhandled** (not caught by the sync try/catch) — a real gap (P1-3).
- **Serialization errors:** Zod-gated at boundaries (`UserStatsSchema.safeParse`, `ContentAccessEntrySchema`); `loadQuestionsFromCache` swallows `JSON.parse` failures and returns null — safe.

---

## 13. Migration / Legacy Audit

- No `AsyncStorage` imports or dependency anywhere (verified by grep). The AsyncStorage → SQLite/MMKV migration is **complete**.
- Legacy key references exist only as comments in `schema.ts` (documents the migration) — fine.
- `migration_quarantine` table: created in `0000`, dropped in `0001` — handled.
- Legacy-ID shim (`syncStore.tsx:98`) intentionally retained with a grace period — correct.
- `docs/storage.md` still describes the app as AsyncStorage-based in parts but explicitly notes the migration in §12.1; stale prose only.

---

## 14. Architectural Consistency

- **Consistent:** one repository layer (driver-agnostic, unit-tested); one offline-queue design; one sync engine; user-scoped `user_id` composite PKs everywhere.
- **Inconsistent:** `HierarchyRepository`/`QuestionRepository`/`QueueRepository` use raw `$client` async APIs; `progress`/`bestScores`/`stats`/`access`/`purchases` services use Drizzle query-builder + broken `db.transaction` replaces. Both are justified individually (bulk vs simple), but the transaction primitive is used incorrectly in the second group (P1-3).
- **Inconsistent:** progress/bestScores read via `useLiveQuery` while stats/purchases/access read via React Query — a genuine design split, but only a problem because the live-query side is broken (P1-4).

---

## A. Executive Verdict

| Dimension | Score |
|---|---|
| SQLite correctness | 4 / 10 |
| MMKV correctness | 6 / 10 |
| Data flow | 4 / 10 |
| Data ownership | 6 / 10 |
| Caching | 4 / 10 |
| Offline architecture | 7 / 10 |
| User isolation | 5 / 10 |
| Performance | 5 / 10 |
| Overall architecture | 4 / 10 |

> **Would you approve this architecture for production? No — not in its current state.** The storage layering decision itself (SQLite = relational data, MMKV = preferences, SecureStore = tokens, React Query = server state) is the correct hybrid. But the code as committed contains a P0 functional break (quiz renders a permanently blank screen), a broken transaction primitive used in five places, a dead live-query mechanism on which the two most visible "progress" surfaces depend, a failing typecheck, and a cross-user profile/content leak. All findings are verified against code and the installed libraries.

---

## B. Critical Findings (verified)

### P0-1 — Quiz screen permanently blank (core feature broken)
- **File:** `src/features/quiz/components/QuizScreen.tsx:42`, `:53`
- **Problem:** Destructures `cacheChecked` from `useQuizSession()`, which never returns it (`useQuizSession.ts:233-251`). `cacheChecked` is always `undefined`.
- **Why it matters:** `if (!cacheChecked)` is always true → renders an empty `<View>` forever; the quiz feature never displays questions in any build.
- **Execution path:** `app/(main)/quiz/[lectureId].tsx` → `QuizScreen` → `useQuizSession` → always-blank branch.
- **Evidence:** `pnpm typecheck` fails with `TS2339` at `QuizScreen.tsx(42,5)`.
- **Fix:** Remove the dead `cacheChecked` gate/destructure, or return a real cache-read flag from the hook.

### P0-2 — Release gate is red (typecheck fails)
- **File:** `src/features/stats/services/statsService.ts:86`
- **Problem:** `JSON.parse(rows[0].payload)` — `rows[0]` is `T | undefined` under `noUncheckedIndexedAccess: true` (`tsconfig.json`). `pnpm typecheck` fails.
- **Fix:** `const first = rows[0]; if (!first) return null;` before parsing.

### P1-3 — `db.transaction(async cb)` is not atomic (five call sites)
- **Files:** `src/shared/utils/cacheUtils.ts:36`, `src/features/learn/services/accessService.ts:57`, `src/features/learn/services/progressService.ts:65`, `src/features/learn/services/bestScoreService.ts:63`, `src/features/purchase/hooks/useMyPurchases.ts:42`
- **Problem:** The sync driver's `transaction()` (`drizzle-orm/expo-sqlite/session.js:31-44`) is synchronous and never awaits the callback. Only the first awaited statement runs inside `BEGIN…COMMIT`; `COMMIT` fires after the first `await`, and all later statements run in auto-commit. Later failures are not rolled back and reject outside the try/catch.
- **Execution path (example `writeCachedAccess`):** `BEGIN` → `DELETE FROM access_map WHERE user_id=?` → `COMMIT` → `INSERT …` (auto-commit). A crash/error in between leaves `access_map` empty → `fetchContentAccess` returns `new Map()` (`accessService.ts:106-109`) → purchased modules appear **locked offline**.
- **Why it matters:** Every cache replace (progress, bestScores, access, purchases) and the 6-table logout purge lose atomicity/rollback.
- **Fix:** Use `withExclusiveTransactionAsync` (already used correctly by `HierarchyRepository`/`QuestionRepository`), or keep the callback fully synchronous.

### P1-4 — `useLiveQuery` is dead: DB opened without `enableChangeListener`
- **File:** `src/db/client.ts:47` — `openDatabaseAsync(DATABASE_NAME)` with no options.
- **Problem:** `useLiveQuery` (`useProgress.ts:35`, `useLectureBestScores.ts:34`) subscribes via `addDatabaseChangeListener`, but expo-sqlite only emits `onDatabaseChange` events when opened with `enableChangeListener: true` (default `false`; confirmed in the repo's own `docs/storage.md` §7.6/§8.4 and the expo-sqlite source). The hooks run once on mount and never re-render on writes.
- **Why it matters:** Drives "completed" badges (ModuleScreen:21) and best-score stars (SubjectScreen:23). After a quiz, writes to SQLite never reach the UI until remount/restart. RQ invalidation keys (`["progress"]`, `["lectureBestScores"]`) do not prefix-match the `["progress_sync",…]`/`["lectureBestScores_sync",…]` keys, so nothing else refreshes them.
- **Fix:** `openDatabaseAsync(DATABASE_NAME, { enableChangeListener: true })` and reconcile invalidation keys.

### P1-5 — Cross-user profile leak in MMKV (profile never synced to server)
- **Files:** `src/shared/storage/mmkv.ts:24-31`, `src/features/profile/hooks/useProfileData.ts:9-10`, `useProfileEdit.ts:10-11`, `src/shared/store/authStore.tsx:156-163`, `src/shared/utils/cacheUtils.ts:7`
- **Problem:** `avatar`/`displayName` live in global, never-cleared MMKV keys; edits save to MMKV only — never to the server `profiles` table.
- **Execution path:** User A sets name/avatar → logout → User B logs in → B sees A's avatar/name.
- **Fix:** Per-user MMKV instances or server-backed profile fields; clear on sign-out.

### P1-6 — Purchases query has no user scoping (relies on RLS)
- **File:** `src/features/purchase/hooks/useMyPurchases.ts:73-77`
- **Problem:** `.eq("status","active")` without `.eq("user_id", userId)`. Masked today by `purchases_self_read` RLS; if RLS is loosened, all users' purchases land in one user's cache.
- **Fix:** Add `.eq("user_id", userId)`.

### P1-7 — Offline-cached question content bypasses access gating on shared devices
- **Files:** `src/features/quiz/services/questionCache.ts:99-147`, `src/shared/utils/cacheUtils.ts:35-43`, `src/shared/store/authStore.tsx:156-163`
- **Problem:** `loadQuestionsFromCacheSync` checks only bypass + version gate — no access check. `clearAllUserCaches` does not purge `questions`/`hierarchy`, and RQ `["quiz"]`/`["hierarchy"]` caches survive logout. A later user on a shared device can take offline quizzes for content they don't own.
- **Fix:** Local entitlement check against `access_map` on the cache read, or purge content on auth change; at minimum document as intended.

### P1-8 — Online quiz path never writes local "completed" progress
- **File:** `src/features/quiz/hooks/useQuizSession.ts:174-176` vs `:118-121`
- **Problem:** Online-success branch calls only `optimisticallyUpdateBestScore`; the offline branch also calls `optimisticallyMarkComplete`. Combined with P1-4, "completed" badges can lag ~10 min and not render until remount/restart.
- **Fix:** Call `optimisticallyMarkComplete` in the online branch too, and fix the live-update path.

### P2-9 — Sync flush guard is per-hook-instance, not global
- **File:** `src/shared/store/syncStore.tsx:58-59`, `:75-81`
- `flushing`/`lastFlushTime` are `useRef`s per `useSyncActions()` call; `SyncProvider` and each `useQuizSession` get private instances, so two flush loops can run concurrently. Safe due to idempotency, but wasted requests and a non-shared 30s backoff.

### P2-10 — Synchronous SQLite reads on every render
- **Files:** `src/features/quiz/hooks/useQuiz.ts:18`, `src/features/stats/hooks/useStats.ts:21`
- Full lecture question bank + `JSON.parse` of all options, and full `user_stats` payload parse + Zod validation, respectively — recomputed on every render (each answer selection, each `pendingCount`/`isOnline` change). Blocks the JS thread; worst offenders on low-end Android.
- **Fix:** Memoize by key or feed `placeholderData` from an async read.

### P2-11 — `optimisticallyUpdateBestScore` non-atomic read-modify-write
- **File:** `src/features/learn/services/bestScoreService.ts:84-95`
- `readCache` then full-map `writeCache`; a concurrent `fetchBestScores` write can interleave and drop a higher score.

### P2-12 — `record-iap` restore path fails server validation
- **File:** `src/shared/store/purchaseStore.tsx:189` with `supabase/functions/record-iap/index.ts:159-184`
- `txId = restored_${productId}` will not match RevenueCat `store_transaction_id`/`product_identifier`; with `REVENUECAT_API_KEY` configured, `restoreModule` silently fails server-side.

### P3 (cleanup)
- **P3-13** — Dead `bookmarks` table (`schema.ts:110-121`, `0002_bookmarks.sql`): zero consumers.
- **P3-14** — Dead `getQueue()` (`offlineQueue.ts:85`): no production callers.
- **P3-15** — `maintenance.ts:27` uses `OPTIMIZE_DEBOUNCE_KEY` declared at `:41` (works; confusing order).
- **P3-16** — `cacheStore.ts:3-4` stale doc ("transient user statistics" — only `questionCacheBypassed` remains).
- **P3-17** — `mmkv.clearAll()` (`mmkv.ts:40`) never invoked.

### Explicitly correct (verified)
- DB singleton + PRAGMA tuning once per connection; WAL/NORMAL/foreign_keys/busy_timeout.
- Sync-capable `$client` (verified against `expo-sqlite@16` types), so all `getAllSync/getFirstSync` uses and `useLiveQuery` are type-valid.
- Offline queue core: atomic INSERT, user-scoped, oldest-first, `23505 → markSynced` idempotency, legacy-ID shim, retention scoped to synced rows.
- Stats double-count prevention (server-id filter).
- Driver-agnostic repositories, genuinely unit-tested (23/23 pass).

---

## C. Data Architecture Map

```
Supabase (remote truth: auth, quiz_results, user_stats, purchases, profiles, content)
    ↓  RQ queryFn / sync flush (idempotent inserts, per-user RLS)
Sync engine (syncStore.flush — pending → server → markSynced)
    ↓
SQLite (harvi.db) — canonical LOCAL mirror:
   content:    hierarchy_* (public), questions (public, downloaded)
   user:       progress, best_scores, quiz_results (≈queue), user_stats, access_map, purchases
   bookkeeping: app_meta (cache-version gate, maintenance timestamps)
    ↓  repositories (Drizzle + raw async $client) → services
React Query — server-state transport + in-memory cache
    ↓
UI (learn / quiz / stats / profile / purchase screens)

MMKV        — device-level preferences: theme, avatar*, displayName*, quiz.fkcol   (* should be user-scoped — P1-5)
SecureStore — Supabase session tokens (chunked adapter)
Zustand     — in-memory: auth session, sync status, RevenueCat readiness, questionCacheBypassed
```

---

## D. Source-of-Truth Matrix

(Full matrix in §4. Flags: progress locally-materialized vs remote-derived; profile split across server `profiles` and MMKV; best scores duplicated but convergent via `max()`.)

---

## E. Storage Decision Audit

- **SQLite** for everything relational/queryable (queue, progress, scores, stats, access, purchases, content) — **correct**.
- **MMKV** for theme — **correct**. For avatar/displayName — **incorrect** (P1-5). For `quiz.fkcol` — acceptable.
- **SecureStore** for Supabase tokens with chunked adapter — **correct** (chunking + stale-chunk cleanup verified).
- **React Query** as server-state transport with SQLite as persistent mirror — **correct separation**, with the render-path sync-read caveat (P2-10).

---

## F. Offline Correctness Verdict

1. **Can data be silently lost?** Mostly no for the queue (pending rows never auto-deleted). Yes for cache atomicity: a crash/error between a `db.transaction` delete and its insert (P1-3) can drop a just-written cache (progress/bestScores/access/purchases) until the next online refetch; and the online quiz path never writes local progress (P1-8).
2. **Can data be duplicated?** No — client UUIDs + server PK + `23505` handling prevent double-submission (verified).
3. **Can data belong to the wrong user?** Queue reads/writes are user-scoped. Edge risk: `enqueueQuizResult` with `user?.id ?? ""` (session mid-expiry) creates rows that can never sync and are never purged (F.3 in §8).
4. **Can sync permanently stall?** Yes for persistent non-duplicate errors (e.g., unrecoverable token refresh): `flush` breaks + backs off, no permanent-failure disposition, no recovery path; sign-out deletes pending rows.
5. **Can logout race with sync?** No corruption found — flush is user-scoped and returns early when `user` is null; `markSynced` on deleted rows affects 0 rows.
6. **Can stale local data overwrite fresh remote data?** Not for the queue (insert-only). Caches merge pending items into snapshots (superset — safe); the non-atomic replace (P1-3) creates a narrow interleaving window.
7. **Can failed operations be accidentally deleted?** No — only `synced` rows are purged by retention; `removeSynced` only marks rows whose insert succeeded or returned `23505`.

---

## G. Performance Verdict

Synchronous SQLite access is **not safe in its current placement**:
- `loadQuestionsFromCacheSync` — full question bank + per-option JSON.parse on every quiz-screen render (each answer selection).
- `readCacheSync` (stats) — full payload parse + Zod validation on every Stats/Mastery render.
- `useLiveQuery` initial sync execution on mount of progress/bestScores — moderate.
- Drizzle sync driver executes all builder queries on the JS thread — acceptable at current data sizes, but these render-path reads must be memoized/hoisted or moved to async reads feeding `placeholderData`.

---

## H. Final Recommendation

**Classification: C — Needs important architectural fixes.**

The layering is right and the offline-queue core is genuinely well-built (idempotent, user-scoped, crash-safe, tested). Not shippable until:

1. Fix P0-1/P0-2 (quiz blank screen + typecheck) — blocking.
2. Replace all five `db.transaction(async …)` uses with `withExclusiveTransactionAsync` (P1-3) — the most important architectural correction.
3. Enable `enableChangeListener` and reconcile RQ invalidation keys (P1-4) so progress/best-score UI is live.
4. Scope/clear MMKV profile keys per user (P1-5), scope the purchases query (P1-6), close the offline content-access gap (P1-7).
5. Move render-path sync reads out of the render loop (P2-10).

None of these require a redesign or another migration — the current storage architecture is the correct end-state; it needs correctness repairs, not re-architecture.

---

*Not verifiable from the repository:* actual device benchmark numbers for the render-path sync reads; live behavior of the RevenueCat validation endpoints without a configured `REVENUECAT_API_KEY`; RLS/table configuration of the live Supabase project beyond the committed migrations.