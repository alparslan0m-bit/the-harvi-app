# Plan — Full AsyncStorage Replacement (SQLite + Drizzle + MMKV + SecureStore)

**Owner:** Mobile architecture (Harvi)
**Scope:** `artifacts/mobile`
**Status:** Ready for Phase A execution
**In scope:** Replace *every* AsyncStorage usage with the hybrid storage layer; data layer + hooks only.
**Out of scope:** Bookmarks, favourite questions, wrong questions (later plan — built on this foundation). No feature UI. **Web target** (react-native-web) is explicitly out of scope — dropping AsyncStorage is accepted to break web; documented in §12.

---

## 1. Executive summary

Harvi's current persistent layer (`@react-native-async-storage/async-storage`) stores
~9 cache domains as JSON blobs keyed by string prefixes. It works, but it carries
structural costs that become real defects at scale:

- **The offline queue** (`offlineQueue.ts`) does a read-all / mutate / write-all of
  the *entire* array on every enqueue — O(n²) under a burst — protected by a
  hand-rolled `withQueueLock` promise chain. A crash between the optimistic update
  and the persist can drop user progress.
- **No querying.** Any "filter / sort / count" requires loading a full JSON blob
  into the JS heap and scanning it.
- **Async-only reads.** Cold-start hydration (`warmStatsCache`, `warmProgressCache`,
  `initTheme`) exists *because* AsyncStorage cannot be read synchronously.
- **No transactions, no encryption, no partial updates**, and a per-string-prefix
  namespace that makes logout cleanup a manual `multiRemove` enumeration.

### The replacement — three-tier storage architecture

| Tier | Technology | Holds | Why this tier |
|---|---|---|---|
| **Relational** | `expo-sqlite` + `drizzle-orm` | All queryable, relational data: hierarchy, questions, progress, best scores, quiz results (the queue), stats aggregate, access map, purchases | Data that benefits from indexes, joins, transactions, partial updates, `COUNT(*)`, and range queries. |
| **Key-Value** | `react-native-mmkv` | Pure scalar preferences: theme, avatar, display name, quiz FK-column resolution | Synchronous reads eliminate hydration flashes. Sub-millisecond access. No queryable structure needed. |
| **Secrets** | `expo-secure-store` (kept) | Auth tokens, refresh tokens | Hardware-backed keychain (iOS) / KeyStore (Android). Never leaves the secure enclave. |

End state: the AsyncStorage dependency is removed from both `dependencies` and
`devDependencies` in `package.json`.

---

## 2. Locked decisions

1. **Full normalization** of the SQLite schema — real relational tables, not
   JSON-blob rows (single deliberate exception: `user_stats`, see §4).
2. **MMKV is KV-only** — theme/profile/fkcol flags. Nothing queryable goes to MMKV.
   **No per-user MMKV instance** for now — the current MMKV data is all global;
   add `createUserStorage(userId)` only when the first user-scoped flag lands.
3. **The offline queue becomes `status='pending'` rows in `quiz_results`.** Atomic
   `INSERT`/`UPDATE` replaces the lock and the quadratic rewrite.
4. **Zero call-site churn.** Public service APIs (`enqueueQuizResult`, `getQueue`,
   `removeSynced`, `clearQueueForUser`, `pendingCount`, `saveQuestionsToCache`,
   `fetchHierarchy`, etc.) are preserved so consumers in `syncStore`, `cacheUtils`,
   `useQuizSession`, stats/progress/bestScore services do not change. **`getQueue()`
   returns only `status='pending'` rows** — this is what keeps the unchanged
   `syncStore` flush loop from re-uploading synced rows.
5. **One-time, idempotent legacy migration** from AsyncStorage → SQLite/MMKV,
   guarded by an `app_meta` flag, executed **in the background** after Drizzle
   migrations on first boot. Boot-critical reads fall through to the new layer
   immediately; legacy data is copied behind the scenes (§6).
6. **Drizzle async driver is the default.** Use `drizzle-orm/expo-sqlite/async` —
   the official async driver over expo-sqlite's `*Async` APIs (merged upstream
   drizzle-team/drizzle-orm#5533). The historical sync-thread footgun is avoided
   architecturally, not worked around (§7).
7. **Repositories only where query logic lives.** Services for the three
   query-shaped domains — queue, question cache, hierarchy — go through thin
   repositories (`QueueRepository`, `QuestionRepository`, `HierarchyRepository`)
   so the ORM is contained and mockable. The remaining blob/KV-shaped domains
   (progress, bestScores, stats, access, purchases) keep their existing service
   shape + memCache and call the async db client directly — no indirection layer
   for what are point reads/writes (§6.1).

---

## 3. New dependencies & build config

| Change | Detail |
|---|---|
| `expo-sqlite` | SQLite binding (Expo SDK 54, `~16.x`) |
| `drizzle-orm` | ORM / query builder over expo-sqlite (async driver: `drizzle-orm/expo-sqlite/async`) |
| `drizzle-kit` (dev) | SQL migration generation; emit a bundled `migrations.js` (`driver: 'expo'`) |
| `react-native-mmkv` | MMKV v4 (NitroModule) — works with `expo-dev-client`; Harvi is already on it |
| `react-native-nitro-modules` | **Required peer of MMKV v4** — install alongside |
| `expo-drizzle-studio-plugin` (dev) | Inspect/edit the on-device DB from the Expo dev menu |
| `jest-expo` + `jest` + `@types/jest` (dev) | Test runner + config for the §10 suite (Phase A) |
| `app.json` | Add plugins: `expo-sqlite`, `react-native-mmkv`; keep `expo-secure-store` |
| `drizzle.config.ts` (new) | `dialect: 'sqlite'`, `driver: 'expo'`, `schema: './src/db/schema.ts'` |
| `package.json` | Add runtime + dev deps above; **remove `@react-native-async-storage/async-storage` from both dep blocks** |
| `jest` config | `preset: 'jest-expo'`; mock `react-native-mmkv` + `expo-sqlite` (see §10) |

**No changes to `babel.config.js` or `metro.config.js`.** Drizzle migrations are
bundled as a generated `migrations.js` module, so neither `babel-plugin-inline-import`
nor a `sql` `sourceExts` entry is needed.

---

## 4. SQLite schema (`src/db/schema.ts`)

All tables keyed by stable server IDs. Zod shapes in `src/shared/types/schemas.ts`
remain the source of truth for payload validation at the boundaries.

### SQLite PRAGMA tuning (applied on `openDatabaseAsync`)

```ts
// Applied once per connection, before any query:
PRAGMA journal_mode = WAL;          -- write-ahead log: concurrent reads during writes
PRAGMA synchronous = NORMAL;        -- safe durability without fsync on every commit
PRAGMA cache_size = -8000;          -- 8 MB page cache (default is 2 MB)
PRAGMA foreign_keys = ON;           -- enforce FK constraints at the engine level
PRAGMA busy_timeout = 5000;         -- 5 s retry on lock contention
```

### Content / hierarchy — replaces `harvi:hierarchy`

```ts
hierarchy_years(id TEXT PK, name TEXT NOT NULL, order INTEGER NOT NULL)

hierarchy_modules(id TEXT PK, name TEXT NOT NULL, year_id TEXT NOT NULL FK → hierarchy_years,
                  order INTEGER NOT NULL, external_price_id TEXT)

hierarchy_subjects(id TEXT PK, name TEXT NOT NULL, module_id TEXT NOT NULL FK → hierarchy_modules,
                   order INTEGER NOT NULL)

hierarchy_lectures(id TEXT PK, name TEXT NOT NULL, external_id TEXT NOT NULL,
                   subject_id TEXT NOT NULL FK → hierarchy_subjects,
                   question_count INTEGER, is_free INTEGER)
```

Indexes: `hierarchy_modules(year_id)`, `hierarchy_subjects(module_id)`,
`hierarchy_lectures(subject_id)`.

### Question content — replaces `harvi:qcache:<lectureId>`

```ts
questions(id TEXT PK, lecture_id TEXT NOT NULL, text TEXT NOT NULL,
          options TEXT NOT NULL,   -- JSON string, validated by QuestionSchema.options
          answer INTEGER NOT NULL, explanation TEXT NOT NULL DEFAULT '',
          image_url TEXT, downloaded_at TEXT NOT NULL)
```

Indexes: `questions(lecture_id)`. No FTS5 table — search is out of scope; add it via
a migration only when a real search feature lands.

### Progress & best scores — replace `harvi:progress:<uid>`, `harvi:bestScores:<uid>`

```ts
progress(user_id TEXT NOT NULL, lecture_id TEXT NOT NULL, completed_at TEXT NOT NULL,
         PRIMARY KEY (user_id, lecture_id))

best_scores(user_id TEXT NOT NULL, lecture_id TEXT NOT NULL, score INTEGER NOT NULL,
            PRIMARY KEY (user_id, lecture_id))
```

### Quiz results + offline queue — replaces `harvi:quiz_queue`

```ts
quiz_results(id TEXT PK,            -- localId (UUID), reuses generateUUID()
             user_id TEXT NOT NULL,
             lecture_id TEXT NOT NULL,
             lecture_name TEXT NOT NULL,
             score INTEGER NOT NULL,
             total_questions INTEGER NOT NULL,
             correct_answers INTEGER NOT NULL,
             created_at TEXT NOT NULL,
             status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced')),
             synced_at TEXT)          -- timestamp of when status flipped to 'synced'
```

Indexes: `quiz_results(status, created_at)`, `quiz_results(user_id)`.

- **Enqueue** = `INSERT INTO quiz_results (...) VALUES ('pending')` — atomic, no lock.
- **getQueue()** = `SELECT ... WHERE status='pending' ORDER BY created_at` — pending
  rows only (keeps `syncStore`'s unchanged flush loop correct).
- **Flush** = per-item Supabase insert, then `UPDATE quiz_results SET status='synced',
  synced_at=datetime('now') WHERE id=?`.
- **removeSynced(localIds)** = batch `UPDATE ... SET status='synced' WHERE id IN (...)`
  inside one transaction.
- **pendingCount(userId)** = `SELECT COUNT(*) WHERE status='pending' [AND user_id=?]`.
- **Retention:** synced rows are kept for local history (future local stats
  recompute) but purged when `synced_at` is older than 30 days — run as a cheap
  `DELETE` during a maintenance flush to prevent unbounded growth.

### User aggregates & entitlements — replace `harvi:stats:<uid>`, `harvi:access:<uid>`, `harvi:purchases:<uid>`

```ts
user_stats(user_id TEXT PK, payload TEXT NOT NULL, updated_at TEXT NOT NULL)
-- Intentional exception to full normalization: UserStats.weekly_activity and
-- .subject_mastery are aggregates of remote data not self-contained locally,
-- so the validated UserStats JSON stays a row. Re-evaluate when local
-- quiz_history is rich enough to recompute it.

access_map(user_id TEXT NOT NULL, item_id TEXT NOT NULL, item_type TEXT NOT NULL CHECK (item_type IN ('module','subject')),
           has_access INTEGER NOT NULL, is_free INTEGER NOT NULL, price_cents INTEGER NOT NULL,
           PRIMARY KEY (user_id, item_id))

purchases(id TEXT PK, user_id TEXT NOT NULL, module_id TEXT,
          amount_cents INTEGER NOT NULL, currency TEXT NOT NULL,
          status TEXT NOT NULL, created_at TEXT NOT NULL)
```

Indexes: `purchases(user_id)`.

### Bookkeeping — new

```ts
app_meta(key TEXT PK, value TEXT NOT NULL)
-- async_migration_v1_done   → legacy migrator idempotency
-- question_cache_version    → preserves the existing CACHE_VERSION gate
```
No `db_schema_version` key — Drizzle tracks applied migrations in its own journal
(`__drizzle_migrations`); a second hand-maintained version would only invite drift.

### Migration quarantine — new

```ts
migration_quarantine(id TEXT PK, source_key TEXT NOT NULL, raw TEXT NOT NULL,
                     error TEXT NOT NULL, quarantined_at TEXT NOT NULL)
-- Corrupt (Zod-rejected) AsyncStorage payloads land here during the legacy
-- migration instead of being silently dropped — raw JSON retained for manual
-- recovery. Empty after a clean migration.
```

The cache-version gate is consolidated here: both the disk gate and the React Query
`queryKey` `"v3"` (`useQuiz.ts`) read from one constant bumped in lockstep, so a
version bump cannot desync disk vs. query cache.

---

## 5. MMKV layer (`src/shared/storage/mmkv.ts`)

### Typed accessor API

MMKV is wrapped in a typed accessor object — no raw `getString`/`setString` calls
scattered across the codebase:

```ts
// src/shared/storage/mmkv.ts
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'harvi-default' }); // plaintext by design — non-sensitive prefs

export const mmkv = {
  // Theme
  getTheme: (): ThemeMode | null => storage.getString('theme') as ThemeMode | null,
  setTheme: (v: ThemeMode) => storage.set('theme', v),

  // Profile
  getAvatar: (): string | null => storage.getString('avatar') ?? null,
  setAvatar: (v: string) => storage.set('avatar', v),
  getDisplayName: (): string => storage.getString('displayName') ?? '',
  setDisplayName: (v: string) => storage.set('displayName', v),

  // Quiz FK column detection
  getFkCol: (): string | null => storage.getString('quiz.fkcol') ?? null,
  setFkCol: (v: string) => storage.set('quiz.fkcol', v),

  // Lifecycle
  clearAll: () => storage.clearAll(),
} as const;
```

All current MMKV data is global:
- `theme` → `themeStore.tsx`
- `avatar`, `displayName` → `useProfileEdit.ts`, `useProfileData.ts`
- `quiz.fkcol` → `questionService.ts`

**No per-user instance.** Introduce `createUserStorage(userId)` (encrypted,
`clearAll()` on logout) only when the first user-scoped flag actually lands.

### Plain by design

`defaultStorage` is **intentionally unencrypted**. It holds only non-sensitive
preferences (theme, avatar, display name, fk column) inside the app sandbox — the
same threat model as the AsyncStorage keys it replaces. Encrypting them would force
a bootstrap ordering problem (MMKV construction is synchronous; SecureStore reads
are async) for zero security gain on this data. Secrets live in SecureStore (§7).

**When the per-user instance lands:** `createUserStorage(userId)` will be encrypted —
generate 32 random bytes via `expo-crypto` on first use, persist under
`harvi.mmkv.encryptionKey`, pass as `encryptionKey` with `encryptionType: 'AES-256'`,
and document the `recrypt()` rotation path in the file header. That instance is
deferred (§12); this plan does not depend on it.

### Migration

Read the four legacy AsyncStorage keys (`harvi:theme`, `harvi:avatar`,
`harvi:displayName`, `harvi:quiz:fkcol`), write to MMKV. The legacy keys are
physically deleted in Phase D, not here — keeping the rollback window open (§11).

---

## 6. DB plumbing (new files)

| File | Purpose |
|---|---|
| `src/db/schema.ts` | Drizzle schema (§4) |
| `src/db/client.ts` | `openDatabaseAsync("harvi.db")` → PRAGMA tuning → `drizzle()` imported from `drizzle-orm/expo-sqlite/async` (a separate module, not a driver option); export singleton |
| `src/db/provider.tsx` | `<DatabaseProvider>` — React context that exposes the initialized `db` instance + migration state to the tree |
| `src/db/migrate.ts` | `useMigrations(db, migrations)` from the bundled `migrations.js` |
| `src/db/legacyMigrator.ts` | One-time, idempotent AsyncStorage → SQLite/MMKV copy, guarded by `app_meta['async_migration_v1_done']` |
| `src/db/maintenance.ts` | Periodic cleanup: purge synced quiz_results older than 30 days + `PRAGMA optimize` on cold start (debounced). `VACUUM` only once post-migration and then throttled (monthly) — never per cold start, it rewrites the whole DB |

### 6.1 Repositories (only where query logic lives)

Repositories exist for the three domains with real query logic — everything else
stays in the existing service shape:

```
src/db/repositories/
  queueRepository.ts       — quiz_results CRUD (pending/synced, retention purge)
  questionRepository.ts    — questions table (bulk write, lecture read, meta)
  hierarchyRepository.ts   — hierarchy 4-table read/write
```

Rationale: progress/bestScores/stats/access/purchases are point reads/writes
already fronted by the memCache sync layer; wrapping each in a repository file
adds a mock seam without adding logic worth isolating. Those services call the
async db client directly. This trims Phase A surface by 5 files while keeping the
testability win where it matters (queue, questions, hierarchy).

### Root layout wiring (`app/_layout.tsx`)

```tsx
<DatabaseProvider>         {/* opens DB, runs PRAGMAs, applies Drizzle migrations */}
  <ThemeProvider>           {/* MMKV sync read — instant, no flash */}
    <AuthProvider>
      <PurchaseProvider>
        <SyncProvider>
          <RootLayoutNav />
        </SyncProvider>
      </PurchaseProvider>
    </AuthProvider>
  </ThemeProvider>
</DatabaseProvider>
```

Boot behavior: `DatabaseProvider` opens the DB, applies PRAGMAs, runs Drizzle
migrations, then kicks off `legacyMigrator` in the background (non-blocking). The
provider renders `children` as soon as migrations complete — it does not wait for
the legacy copy. MMKV values are synchronous from the first render regardless of
migration state.

---

## 7. SecureStore hardening (`expo-secure-store`)

SecureStore already holds the Supabase session (access + refresh tokens), stored
through the chunking adapter in `src/shared/services/supabase.ts:33-125` under
**supabase-js-managed keys** (e.g. `sb-<project-ref>-auth-token`), not
app-defined names. This plan adds **no new SecureStore keys** — `defaultStorage`
MMKV is plaintext by design (§5). When the encrypted per-user MMKV instance ships,
its AES key is added here as `harvi.mmkv.encryptionKey`.

**Best practices enforced:**
- `SecureStore.setItemAsync(key, value, { keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY })` on iOS.
- Never store anything queryable here — SecureStore is a vault, not a database.
- Size limit: 2 KB per item (iOS Keychain constraint). Session JWTs exceed this;
  the existing chunking adapter already handles it.

---

## 8. Performance mitigations (Drizzle async driver)

The historical caveat — `drizzle-orm/expo-sqlite` executing synchronously through
expo-sqlite's sync API even when awaited (drizzle-team/drizzle-orm#5240) — is
**avoided architecturally** by importing the async driver
(`drizzle-orm/expo-sqlite/async`, merged in drizzle-team/drizzle-orm#5533), which
routes through `getAllAsync`/`runAsync`/`executeAsync` on expo-sqlite's background
thread. No chunked `delay(0)` choreography needed.

Remaining discipline:

- **Bulk imports** (question cache download, hierarchy assembly): one
  `withTransactionAsync` per chunk (~500 rows), using the async driver.
- **Normal reads**: keep narrow (single lecture, single user) — µs–ms class.
- **`COUNT(*) WHERE status='pending'`** stays cheap for `syncStore` / `OfflineBanner`.
- **WAL mode** (§4 PRAGMAs) allows concurrent reads during writes — no reader
  starvation during bulk inserts.
- **Measure on a low-end Android device** (2–3 GB RAM) during Phase B acceptance.
  Target: cold-start to interactive < 1.5 s; queue enqueue < 10 ms; hierarchy
  read < 50 ms.

---

## 9. File-by-file change map

| File | Change |
|---|---|
| `src/db/schema.ts`, `client.ts`, `provider.tsx`, `migrate.ts`, `legacyMigrator.ts`, `maintenance.ts` | **new** |
| `src/db/repositories/queueRepository.ts`, `questionRepository.ts`, `hierarchyRepository.ts` | **new** |
| `src/shared/storage/mmkv.ts` | **new** |
| `drizzle.config.ts` | **new** |
| `src/shared/services/offlineQueue.ts` | Rewrite over `queueRepository`; keep all exports & signatures; `getQueue()` = pending-only; add synced-row retention purge |
| `src/features/quiz/services/questionCache.ts` | Rewrite over `questionRepository`; keep 5 exports; `CACHE_VERSION` via `app_meta` (single constant shared with `useQuiz` query key) |
| `src/features/learn/services/hierarchyService.ts` | Cache read/write over `hierarchyRepository`; keep `fetchHierarchy()`; reuse assembly logic |
| `src/features/learn/services/progressService.ts` | `progress` table via async db client; keep `memCache` sync layer backed by SQLite |
| `src/features/learn/services/bestScoreService.ts` | `best_scores` table via async db client; same pattern |
| `src/features/stats/services/statsService.ts` | `user_stats` row via async db client; keep public API + memCache pattern |
| `src/features/learn/services/accessService.ts` | `access_map` table via async db client |
| `src/features/purchase/hooks/useMyPurchases.ts` | `purchases` table via async db client |
| `src/shared/utils/cacheUtils.ts` | `clearAllUserCaches` → `DELETE … WHERE user_id` across tables (+ MMKV global keys untouched — they are not user-scoped) |
| `src/shared/store/themeStore.tsx` | `mmkv.getTheme()` / `mmkv.setTheme()` — **synchronous** read (remove async hydration, delete `initTheme`, delete `ThemeProvider` async `useEffect`) |
| `src/features/profile/hooks/useProfileEdit.ts`, `useProfileData.ts` | `mmkv.getAvatar()` / `mmkv.setAvatar()`, `mmkv.getDisplayName()` / `mmkv.setDisplayName()` |
| `src/features/quiz/services/questionService.ts` | `harvi:quiz:fkcol` → `mmkv.getFkCol()` / `mmkv.setFkCol()` |
| `src/features/quiz/hooks/useQuiz.ts` | Consolidate `CACHE_VERSION` with `app_meta` constant |
| `src/shared/constants/storage.ts` | **Delete** — keys move into `mmkv.ts` typed accessors; no free-form string keys |
| `app/_layout.tsx` | Mount `<DatabaseProvider>` wrapping existing providers |
| `docs/STATE_MANAGEMENT.md`, `docs/storage.md` | Update to describe the three-tier disk layer |

**Unchanged:** `syncStore.tsx` (consumes `offlineQueue` API), `cacheStore.ts`
(in-memory only), `authStore.tsx` (SecureStore already correct), all React Query hooks
(except `useQuiz.ts` constant consolidation).

---

## 10. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Data loss during one-time migration | **High** | Migrator copies first, verifies row counts against source. Legacy keys are **verified in Phase B, physically deleted in Phase D** (keeps the Phase C rollback window open). Corrupt payloads (Zod rejection) are written to the `migration_quarantine` table with the raw JSON for manual recovery — never silently dropped. |
| Cold-start stall from migration | Medium | Background migration (§6): `DatabaseProvider` renders children immediately after Drizzle migrations; heavy legacy copy runs async. No splash gate. |
| Drizzle sync-thread jank | Medium | Async driver (`drizzle-orm/expo-sqlite/async`) is the default; bulk paths chunked via `withTransactionAsync`; WAL mode for concurrent reads. |
| Schema drift vs Supabase (dynamic FK detection) | Low | Normalized tables keyed by stable server IDs; reuse existing `detectFK` candidate lists during fetch. MMKV caches the resolved FK column. |
| MMKV data exposure | Low | `defaultStorage` is plaintext by design and holds only non-sensitive prefs (theme/avatar/displayName/fkcol) in the app sandbox — same threat model as the AsyncStorage keys it replaces. Secrets stay in SecureStore. The deferred per-user instance will follow the key-in-SecureStore + AES-256 pattern (§5, §12). |
| MMKV v4 missing native peer | Low | `react-native-nitro-modules` installed as a required dependency (§3). |
| WAL sidecar inconsistency | Low | Checkpoint before any future DB snapshot/backup; `PRAGMA wal_checkpoint(TRUNCATE)` + `PRAGMA optimize` in maintenance; `VACUUM` throttled (post-migration, then monthly) — never per cold start |
| Cache-version invalidation regression | Medium | Single `CACHE_VERSION` constant drives both the `app_meta` disk gate and the RQ query key — bump cannot desync. |
| Cross-user leakage / logout leftovers | **High** | `DELETE … WHERE user_id` across all tables in `clearAllUserCaches`; MMKV data is global-only so no per-user instance to clear. |
| `quiz_results` unbounded growth | Low | 30-day retention purge of `synced` rows during `maintenance.ts` cold-start flush. |
| `UserStats` recompute assumption | Low | Documented exception (§4); revisit only when local quiz history is rich enough. |
| Drizzle Studio broken on SDK 54 | Low | Known infinite-load issue (drizzle-team/drizzle-studio-expo#23) — verify in dev; fall back to `expo-sqlite-devtools` if broken. |
| Web regression | Accepted | Documented: web is out of scope (§12). |

---

## 11. Verification & rollout phases

**Per phase:** `npm run typecheck` (workspace `artifacts/mobile`). **Plus** `npm test`
once jest-expo lands in Phase A — the suite below becomes the automated gate.

### Tests (jest-expo, added Phase A)

- Drizzle schema + repository queries run against in-memory SQLite in Node via
  `drizzle-orm/better-sqlite3` (shares the driver-agnostic `sqliteTable` schema module).
- `legacyMigrator` fixtures: happy path, empty store, already-migrated (idempotency),
  and one **corrupt Zod-rejected queue payload** (must quarantine, not crash).
- Jest mocks for `react-native-mmkv` and `expo-sqlite` (in-memory map mirroring the
  API surface) so components don't touch real JSI.
- Repository unit tests: queue/question/hierarchy repositories tested in isolation
  against in-memory SQLite.

### Perf budget gates

| Metric | Target | Measured on |
|---|---|---|
| Cold start → interactive | < 1.5 s | Low-end Android (2–3 GB RAM) |
| `enqueueQuizResult` | < 10 ms | Same device |
| `fetchHierarchy` (cache hit) | < 50 ms | Same device |
| `pendingCount` | < 5 ms | Same device |
| Question cache read (100 questions) | < 30 ms | Same device |

### Manual QA matrix (low-end Android + iOS)

- Cold start offline → cached hierarchy/questions load.
- Complete a quiz offline → queue row appears (`status='pending'`), banner count
  updates, `pendingCount` correct.
- Reconnect → flush uploads, rows flip to `synced`, React Query invalidation fires.
- Kill app → reopen offline → progress/bestScores/stats/access intact (no flash).
- Sign out / sign in as another user → no cross-user leakage.
- **Drizzle Studio** (`shift+m` in dev) to inspect all tables post-migration.
- Theme switching → instant (no async flash). Verify MMKV persistence across restarts.
- Profile edit → avatar/name persist via MMKV, survive app kill.

### Phases

1. **A — Foundation:** deps + config (§3), schema (§4), db client/provider/migrate
   (async driver + PRAGMAs), MMKV typed accessor module (plain defaultStorage),
   legacy migrator (§6, background + quarantine), jest-expo + mocks, the three
   repositories. No behavior change; ships with migrations running. Existing
   AsyncStorage still active.
   - **Rollback:** Revert the commit; no data has moved yet.

2. **B — SQLite replacement:** queue + all cache services (§9) rewired through
   repositories. Legacy migrator copies AsyncStorage data into SQLite on first boot.
   Dual-read: service tries SQLite first, falls back to AsyncStorage if the migration
   flag hasn't flipped. One release bake.
   - **Rollback:** Flag `async_migration_v1_done` not set → services still read
     AsyncStorage. Revert to Phase A code; SQLite data is abandoned (it was a copy).

3. **C — MMKV:** theme/profile/fkcol. Synchronous init; remove `initTheme` async
   ceremony, `ThemeProvider` useEffect, AsyncStorage reads in `useProfileEdit` and
   `useProfileData`. Delete `src/shared/constants/storage.ts`.
   - **Rollback:** Revert to Phase B code; MMKV keys are abandoned; AsyncStorage
     keys still exist (legacy migrator deletes them only after Phase D).

4. **D — Retirement:** drop `@react-native-async-storage/async-storage` from both
   dep blocks; legacy migrator deletes consumed AsyncStorage keys; remove shims and
   fallback reads; delete `legacyMigrator.ts` (its job is done); update docs; confirm
   the accepted web tradeoff in §12. Run `VACUUM` once post-migration to reclaim
   any wasted pages.
   - **Rollback:** Re-add AsyncStorage dep; legacy data is gone but SQLite/MMKV now
     hold the canonical copy. No data loss — only the old keys are deleted.

**Definition of done:** AsyncStorage absent from `package.json` (both blocks) and
`src/`; all offline flows pass the QA matrix; `typecheck` and `test` green; perf
budgets met on low-end Android.

---

## 12. Open questions / deferred

- Supabase sync for future bookmarks/favourites/wrong-questions: **deferred** (local-only
  when they land).
- `user_stats` recomputation from local `quiz_results`: deferred until local history
  is rich enough.
- **Web:** dropping AsyncStorage breaks `react-native-web` (MMKV web fallback lacks
  encryption; expo-sqlite web is WASM). **Accepted as out of scope.** If web ever
  becomes a shipping target, gate the storage layer per platform.
- FTS5 question search: deferred; add via migration when the feature exists.
- Per-user encrypted MMKV instance: deferred; add when the first user-scoped MMKV
  flag exists.
- UI screens: out of scope.
- Biometric unlock for SecureStore: deferred; add when sensitive user data (medical
  records, payment details) is stored locally.
- Database backup/export: deferred; requires WAL checkpoint + file copy — document
  the path when the feature lands.