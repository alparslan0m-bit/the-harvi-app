# Offline Behavior

> **Auto-generated** by `docs/extractors/offline-behavior.js`.
> Generated at 2026-08-14T21:56:42.900Z
> Documents what each feature does when the device is offline.

## 📡 Feature Offline Capability Matrix

| Feature | Supabase Calls | Cache Fallback | Offline Queue | Mem Cache | NetInfo Check |
|---------|----------------|----------------|---------------|-----------|---------------|
| **auth** | 0 | ❌ | ❌ | ❌ | ❌ |
| **learn** | 5 | ✅ | ✅ | ✅ | ✅ |
| **profile** | 2 | ❌ | ❌ | ❌ | ✅ |
| **purchase** | 0 | ✅ | ❌ | ❌ | ✅ |
| **quiz** | 1 | ✅ | ✅ | ❌ | ✅ |
| **shared** | 1 | ❌ | ❌ | ❌ | ✅ |
| **shared_services** | 0 | ❌ | ✅ | ❌ | ❌ |
| **shared_stores** | 13 | ❌ | ✅ | ✅ | ✅ |
| **stats** | 2 | ✅ | ✅ | ✅ | ✅ |

## 🔍 Detailed Offline Patterns

### learn

- **Memory cache (memCache)** — `artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts`
- **Memory cache (memCache)** — `artifacts/mobile/src/features/learn/hooks/useProgress.ts`
- **Offline queue (enqueue → sync later)** — `artifacts/mobile/src/features/learn/services/bestScoreService.ts`
- **Memory cache (memCache)** — `artifacts/mobile/src/features/learn/services/bestScoreService.ts`
- **Offline queue (enqueue → sync later)** — `artifacts/mobile/src/features/learn/services/progressService.ts`
- **Memory cache (memCache)** — `artifacts/mobile/src/features/learn/services/progressService.ts`

### quiz

- **Offline queue (enqueue → sync later)** — `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts`

### shared_services

- **Offline queue (enqueue → sync later)** — `artifacts/mobile/src/shared/services/offlineQueue.ts`

### shared_stores

- **Memory cache (memCache)** — `artifacts/mobile/src/shared/store/authStore.tsx`
- **Offline queue (enqueue → sync later)** — `artifacts/mobile/src/shared/store/syncStore.tsx`

### stats

- **Memory cache (memCache)** — `artifacts/mobile/src/features/stats/hooks/useStats.ts`
- **Offline queue (enqueue → sync later)** — `artifacts/mobile/src/features/stats/services/statsService.ts`

## 🔄 Sync Pipeline

_How offline data gets synced when connectivity returns:_

1. **NetInfo detects connectivity change** — `artifacts/mobile/src/shared/store/syncStore.tsx`
2. **Flush drains offline queue** — `artifacts/mobile/src/shared/store/syncStore.tsx`
3. **Batch insert to supabase.from('quiz_results')** — `artifacts/mobile/src/shared/store/syncStore.tsx`
4. **Invalidate query caches (stats, progress)** — `artifacts/mobile/src/shared/store/syncStore.tsx`
5. **Timeout: 10s, with basic backoff** — `artifacts/mobile/src/shared/store/syncStore.tsx`

## 🏗️ Cache Tiers

_The app uses a three-tier cache strategy for critical data:_

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  memCache    │ ──► │  AsyncStorage     │ ──► │  Supabase    │
│  (in-memory) │     │  (persistent)     │     │  (server)    │
└─────────────┘     └──────────────────┘     └──────────────┘
   Fastest              Survives restart        Source of truth
```

**Services using all three tiers:** learn, stats

