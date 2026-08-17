# API Surface

> **Auto-generated** by `docs/extractors/api-surface.js`.
> Generated at 2026-08-17T09:35:53.846Z
> Every Supabase call in the codebase, mapped to file and line.

## Summary

| Type | Count |
|------|-------|
| Database queries | 15 |
| RPC calls | 3 |
| Edge function invocations | 1 |
| Auth method calls | 10 |

## 🗄️ Database Queries

### feedback

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| INSERT | `artifacts/mobile/src/shared/hooks/useFeedback.ts` | 103 | — | — |

### lectures

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 119 | * | — |
| SELECT | `artifacts/mobile/src/features/stats/services/statsService.ts` | 116 | id, name | — |

### modules

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 117 | * | — |

### purchases

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts` | 73 | id, module_id, amount_cents, currency, status, created_at | .eq("status") |

### questions

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/quiz/services/questionService.ts` | 61 | * | — |

### quiz_results

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/bestScoreService.ts` | 135 | lecture_id, score | .eq("user_id") |
| SELECT | `artifacts/mobile/src/features/learn/services/progressService.ts` | 154 | lecture_id | .eq("user_id") |
| DELETE | `artifacts/mobile/src/features/profile/components/AccountActions.tsx` | 54 | — | .eq("user_id") |
| INSERT | `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts` | 125 | — | — |
| INSERT | `artifacts/mobile/src/shared/store/syncStore.tsx` | 113 | — | — |

### subjects

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 118 | * | — |

### user_stats

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| DELETE | `artifacts/mobile/src/features/profile/components/AccountActions.tsx` | 55 | — | .eq("user_id") |
| SELECT | `artifacts/mobile/src/features/stats/services/statsService.ts` | 433 | * | .eq("user_id") |

### years

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 116 | * | — |

## 🔧 RPC Calls

| RPC Name | File | Line | Params |
|----------|------|------|--------|
| `get_content_access_map` | `artifacts/mobile/src/features/learn/services/accessService.ts` | 89 | `—` |
| `get_user_stats_overview` | `artifacts/mobile/src/features/stats/services/statsService.ts` | 439 | `{
      p_user_id: userId,
    }` |
| `redeem_access_code` | `artifacts/mobile/src/shared/store/purchaseStore.tsx` | 125 | `{ p_code: code }` |

## ⚡ Edge Function Invocations

| Function | File | Line |
|----------|------|------|
| `record-iap` | `artifacts/mobile/src/shared/store/purchaseStore.tsx` | 64 |

## 🔐 Auth Methods

| Method | File | Line |
|--------|------|------|
| `exchangeCodeForSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 127 |
| `exchangeCodeForSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 206 |
| `getSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 177 |
| `onAuthStateChange` | `artifacts/mobile/src/shared/store/authStore.tsx` | 183 |
| `setSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 135 |
| `setSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 213 |
| `signInWithOAuth` | `artifacts/mobile/src/shared/store/authStore.tsx` | 106 |
| `signInWithPassword` | `artifacts/mobile/src/shared/store/authStore.tsx` | 78 |
| `signOut` | `artifacts/mobile/src/shared/store/authStore.tsx` | 161 |
| `signUp` | `artifacts/mobile/src/shared/store/authStore.tsx` | 93 |

