# Cache Map

> **Auto-generated** by `docs/extractors/cache-map.js`.
> Generated at 2026-08-14T22:26:51.367Z
> Every AsyncStorage and SecureStore key in the codebase.

## Summary

- **12** AsyncStorage key patterns
- **1** SecureStore key patterns

## 💾 AsyncStorage Keys

| Key Pattern | Defined In | Operations | Read By | Written By |
|-------------|-----------|------------|---------|------------|
| `harvi:access:{id}` | `artifacts/mobile/src/features/learn/services/accessService.ts` | read, write | `accessService.ts` | `accessService.ts` |
| `harvi:avatar` | `artifacts/mobile/src/features/profile/hooks/useProfileEdit.ts` | read, write | `useProfileEdit.ts` | `useProfileEdit.ts` |
| `harvi:bestScores:{id}` | `artifacts/mobile/src/features/learn/services/bestScoreService.ts` | read, write, delete | `bestScoreService.ts` | `bestScoreService.ts` |
| `harvi:displayName` | `artifacts/mobile/src/features/profile/hooks/useProfileEdit.ts` | read, write | `useProfileEdit.ts` | `useProfileEdit.ts` |
| `harvi:hierarchy` | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | read, write | `hierarchyService.ts` | `hierarchyService.ts` |
| `harvi:progress:{id}` | `artifacts/mobile/src/features/learn/services/progressService.ts` | read, write, delete | `progressService.ts` | `progressService.ts` |
| `harvi:purchases:{id}` | `artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts` | read, write | `useMyPurchases.ts` | `useMyPurchases.ts` |
| `harvi:qcache:{id}` | `artifacts/mobile/src/features/quiz/services/questionCache.ts` | read, write, delete | `questionCache.ts` | `questionCache.ts` |
| `harvi:quiz:fkcol` | `artifacts/mobile/src/features/quiz/services/questionService.ts` | read, write | `questionService.ts` | `questionService.ts` |
| `harvi:quiz_queue` | `artifacts/mobile/src/shared/services/offlineQueue.ts` | read, write | `offlineQueue.ts` | `offlineQueue.ts` |
| `harvi:stats:{id}` | `artifacts/mobile/src/features/stats/services/statsService.ts` | read, write, delete | `statsService.ts` | `statsService.ts` |
| `harvi:theme` | `artifacts/mobile/src/shared/store/themeStore.tsx` | read, write | `themeStore.tsx` | `themeStore.tsx` |

## 🔒 SecureStore Keys

| Key | File | Chunked? |
|-----|------|----------|
| `${key}.__count` | `artifacts/mobile/src/shared/services/supabase.ts` | ✅ (1800B chunks) |

## 📋 Namespace Breakdown

| Prefix | Key Count |
|--------|-----------|
| `harvi:access:*` | 1 |
| `harvi:avatar:*` | 1 |
| `harvi:bestScores:*` | 1 |
| `harvi:displayName:*` | 1 |
| `harvi:hierarchy:*` | 1 |
| `harvi:progress:*` | 1 |
| `harvi:purchases:*` | 1 |
| `harvi:qcache:*` | 1 |
| `harvi:quiz:*` | 1 |
| `harvi:quiz_queue:*` | 1 |
| `harvi:stats:*` | 1 |
| `harvi:theme:*` | 1 |

