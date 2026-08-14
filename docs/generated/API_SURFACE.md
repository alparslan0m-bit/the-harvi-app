# API Surface

> **Auto-generated** by `docs/extractors/api-surface.js`.
> Generated at 2026-08-14T21:56:40.990Z
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
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 129 | * | — |
| SELECT | `artifacts/mobile/src/features/stats/services/statsService.ts` | 101 | id, name | — |

### modules

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 127 | * | — |

### purchases

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts` | 55 | id, module_id, amount_cents, currency, status, created_at | .eq("status") |

### questions

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/quiz/services/questionService.ts` | 64 | * | — |

### quiz_results

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/bestScoreService.ts` | 138 | lecture_id, score | .eq("user_id") |
| SELECT | `artifacts/mobile/src/features/learn/services/progressService.ts` | 161 | col | .eq("user_id") |
| DELETE | `artifacts/mobile/src/features/profile/components/AccountActions.tsx` | 57 | — | .eq("user_id") |
| INSERT | `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts` | 147 | — | — |
| INSERT | `artifacts/mobile/src/shared/store/syncStore.tsx` | 114 | — | — |

### subjects

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 128 | * | — |

### user_stats

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| DELETE | `artifacts/mobile/src/features/profile/components/AccountActions.tsx` | 58 | — | .eq("user_id") |
| SELECT | `artifacts/mobile/src/features/stats/services/statsService.ts` | 421 | * | .eq("user_id") |

### years

| Operation | File | Line | Columns/Shape | Filter |
|-----------|------|------|---------------|--------|
| SELECT | `artifacts/mobile/src/features/learn/services/hierarchyService.ts` | 126 | * | — |

## 🔧 RPC Calls

| RPC Name | File | Line | Params |
|----------|------|------|--------|
| `get_content_access_map` | `artifacts/mobile/src/features/learn/services/accessService.ts` | 61 | `—` |
| `get_user_stats_overview` | `artifacts/mobile/src/features/stats/services/statsService.ts` | 427 | `{
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
| `exchangeCodeForSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 135 |
| `exchangeCodeForSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 216 |
| `getSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 189 |
| `onAuthStateChange` | `artifacts/mobile/src/shared/store/authStore.tsx` | 195 |
| `setSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 143 |
| `setSession` | `artifacts/mobile/src/shared/store/authStore.tsx` | 223 |
| `signInWithOAuth` | `artifacts/mobile/src/shared/store/authStore.tsx` | 114 |
| `signInWithPassword` | `artifacts/mobile/src/shared/store/authStore.tsx` | 86 |
| `signOut` | `artifacts/mobile/src/shared/store/authStore.tsx` | 169 |
| `signUp` | `artifacts/mobile/src/shared/store/authStore.tsx` | 101 |

