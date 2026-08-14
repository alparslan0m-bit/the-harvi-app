# API Surface

> **Auto-generated** by `docs/extractors/api-surface.js`.
> Generated at 2026-08-14T16:53:11.575Z
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
| INSERT | `artifacts/mobile/src/shared/hooks/useFeedback.ts` | 79 | — | — |

### lectures

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 94 | * | — |
| SELECT | `artifacts/mobile/src/features/stats/services/statsService.ts` | 88 | id, name | — |

### modules

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 92 | * | — |

### purchases

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts` | 55 | id, module_id, amount_cents, currency, status, created_at | .eq("status") |

### questions

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/quiz/services/questionService.ts` | 47 | * | — |

### quiz_results

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/bestScoreService.ts` | 138 | lecture_id, score | .eq("user_id") |
| SELECT | `artifacts/mobile/src/features/learn/services/progressService.ts` | 126 | col | .eq("user_id") |
| DELETE | `artifacts/mobile/src/features/profile/components/AccountActions.tsx` | 56 | — | .eq("user_id") |
| INSERT | `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts` | 147 | — | — |
| INSERT | `artifacts/mobile/src/shared/store/syncStore.tsx` | 83 | — | — |

### subjects

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 93 | * | — |

### user_stats

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| DELETE | `artifacts/mobile/src/features/profile/components/AccountActions.tsx` | 57 | — | .eq("user_id") |
| SELECT | `artifacts/mobile/src/features/stats/services/statsService.ts` | 397 | * | .eq("user_id") |

### years

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 91 | * | — |

## 🔧 RPC Calls

| RPC Name | File | Line | Params |
|----------|------|------|--------|
| `get_content_access_map` | `artifacts/mobile/src/features/learn/services/accessService.ts` | 61 | `—` |
| `get_user_stats_overview` | `artifacts/mobile/src/features/stats/services/statsService.ts` | 403 | `{
      p_user_id: userId,
    }` |
| `redeem_access_code` | `artifacts/mobile/src/shared/store/purchaseStore.tsx` | 99 | `{ p_code: code }` |

## ⚡ Edge Function Invocations

| Function | File | Line |
|----------|------|------|
| `record-iap` | `artifacts/mobile/src/shared/store/purchaseStore.tsx` | 49 |

## 🔐 Auth Methods

| Method | File | Line |
|--------|------|------|
| `exchangeCodeForSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 86 |
| `exchangeCodeForSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 151 |
| `getSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 124 |
| `onAuthStateChange` | `artifacts/mobile/src/shared/store/authStore.tsx` | 130 |
| `setSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 94 |
| `setSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 158 |
| `signInWithOAuth` | `artifacts/mobile/src/shared/store/authStore.tsx` | 65 |
| `signInWithPassword` | `artifacts/mobile/src/shared/store/authStore.tsx` | 52 |
| `signOut` | `artifacts/mobile/src/shared/store/authStore.tsx` | 111 |
| `signUp` | `artifacts/mobile/src/shared/store/authStore.tsx` | 59 |

