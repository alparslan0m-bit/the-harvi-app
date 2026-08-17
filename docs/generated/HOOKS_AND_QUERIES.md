# Hooks & Queries

> **Auto-generated** by `docs/extractors/hooks-and-queries.js`.
> Generated at 2026-08-17T10:59:15.028Z
> Maps the full React Query key space and custom hook dependency tree.

## 🔑 Query Keys

| Key | Hook | File | Stale Time |
|-----|------|------|------------|
| `["hierarchy"]` | `useHierarchy()` | `artifacts/mobile/src/features/learn/hooks/useHierarchy.ts` | 1000 * 60 * 10 |
| `["lectureBestScores_sync", user?.id]` | `useLectureBestScores()` | `artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts` | 1000 * 60 * 10 |
| `["content_access", user?.id]` | `useModuleAccess()` | `artifacts/mobile/src/features/learn/hooks/useModuleAccess.ts` | 1000 * 60 * 5 |
| `["progress_sync", user?.id]` | `useProgress()` | `artifacts/mobile/src/features/learn/hooks/useProgress.ts` | 1000 * 60 * 10 |
| `["my_purchases", user?.id]` | `useMyPurchases()` | `artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts` | 1000 * 60 * 10 |
| `["quiz", lectureId, QUESTION_CACHE_VERSION]` | `useQuizQuestions()` | `artifacts/mobile/src/features/quiz/hooks/useQuiz.ts` | 0 |
| `["stats", userId]` | `useStats()` | `artifacts/mobile/src/features/stats/hooks/useStats.ts` | 1000 * 60 * 10 |

## 🔄 Invalidation Chains

_When X happens, which query caches get busted?_

| Trigger | Invalidates | Type | File:Line |
|---------|------------|------|----------|
| AccountActions (AccountActions.tsx) | `stats` | invalidate | `artifacts/mobile/src/features/profile/components/AccountActions.tsx:80` |
| AccountActions (AccountActions.tsx) | `progress_sync` | invalidate | `artifacts/mobile/src/features/profile/components/AccountActions.tsx:81` |
| AccountActions (AccountActions.tsx) | `lectureBestScores_sync` | invalidate | `artifacts/mobile/src/features/profile/components/AccountActions.tsx:82` |
| removeQueries (cache clear) (AccountActions.tsx) | `quiz` | remove | `artifacts/mobile/src/features/profile/components/AccountActions.tsx:104` |
| removeQueries (cache clear) (authStore.tsx) | `quiz` | remove | `artifacts/mobile/src/shared/store/authStore.tsx:193` |
| removeQueries (cache clear) (authStore.tsx) | `hierarchy` | remove | `artifacts/mobile/src/shared/store/authStore.tsx:194` |
| setQueriesData (optimistic) (AccountActions.tsx) | `stats` | optimistic | `artifacts/mobile/src/features/profile/components/AccountActions.tsx:73` |
| setQueriesData (optimistic) (AccountActions.tsx) | `progress_sync` | optimistic | `artifacts/mobile/src/features/profile/components/AccountActions.tsx:74` |
| setQueriesData (optimistic) (AccountActions.tsx) | `lectureBestScores_sync` | optimistic | `artifacts/mobile/src/features/profile/components/AccountActions.tsx:75` |
| setQueriesData (optimistic) (AccountActions.tsx) | `quiz` | optimistic | `artifacts/mobile/src/features/profile/components/AccountActions.tsx:103` |
| usePurchaseActions (purchaseStore.tsx) | `content_access` | invalidate | `artifacts/mobile/src/shared/store/purchaseStore.tsx:51` |
| usePurchaseActions (purchaseStore.tsx) | `my_purchases` | invalidate | `artifacts/mobile/src/shared/store/purchaseStore.tsx:52` |
| usePurchaseActions (purchaseStore.tsx) | `hierarchy` | invalidate | `artifacts/mobile/src/shared/store/purchaseStore.tsx:53` |
| usePurchaseActions (purchaseStore.tsx) | `quiz` | invalidate | `artifacts/mobile/src/shared/store/purchaseStore.tsx:54` |
| useQuizSession (useQuizSession.ts) | `progress_sync` | invalidate | `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts:186` |
| useQuizSession (useQuizSession.ts) | `stats` | invalidate | `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts:187` |
| useQuizSession (useQuizSession.ts) | `lectureBestScores_sync` | invalidate | `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts:188` |
| useSyncActions (syncStore.tsx) | `stats` | invalidate | `artifacts/mobile/src/shared/store/syncStore.tsx:150` |
| useSyncActions (syncStore.tsx) | `progress_sync` | invalidate | `artifacts/mobile/src/shared/store/syncStore.tsx:151` |

## 📊 Per-Key Invalidation Summary

| Query Key | Invalidated By |
|-----------|---------------|
| `content_access` | usePurchaseActions |
| `hierarchy` | removeQueries (cache clear), usePurchaseActions |
| `lectureBestScores_sync` | AccountActions, setQueriesData (optimistic), useQuizSession |
| `my_purchases` | usePurchaseActions |
| `progress_sync` | AccountActions, setQueriesData (optimistic), useQuizSession, useSyncActions |
| `quiz` | setQueriesData (optimistic), removeQueries (cache clear), usePurchaseActions |
| `stats` | AccountActions, setQueriesData (optimistic), useQuizSession, useSyncActions |

## 🪝 Custom Hooks

| Hook | Params | File | Depends On | Returns |
|------|--------|------|------------|--------|
| `useDatabaseMigrations()` | db: Database | `artifacts/mobile/src/db/migrate.ts` | — | — |
| `useDatabase()` | — | `artifacts/mobile/src/db/provider.tsx` | — | — |
| `useAuthForm()` | — | `artifacts/mobile/src/features/auth/hooks/useAuthForm.ts` | authStore | mode, email, setEmail, password, setPassword, loading, googleLoading, error, showPassword, setShowPassword, showSetup, setShowSetup, focusedField, setFocusedField, handleSubmit, handleGoogleSignIn, toggleMode |
| `useHierarchy()` | — | `artifacts/mobile/src/features/learn/hooks/useHierarchy.ts` | React Query | — |
| `useLearnFlow()` | scrollRef: React.RefObject<ScrollView | null> | `artifacts/mobile/src/features/learn/hooks/useLearnFlow.ts` | authStore | authLoading, fadeAnim, translateY |
| `useLectureBestScores()` | — | `artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts` | authStore, React Query | — |
| `useRefreshBestScores()` | — | `artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts` | — | — |
| `useMasteryFilter()` | allData: UserStats["subject_mastery"] | `artifacts/mobile/src/features/learn/hooks/useMasteryFilter.ts` | — | search, setSearch, filter, setFilter, counts, overallAvg, items |
| `useModuleAccess()` | — | `artifacts/mobile/src/features/learn/hooks/useModuleAccess.ts` | authStore, React Query | — |
| `useProgress()` | — | `artifacts/mobile/src/features/learn/hooks/useProgress.ts` | authStore, React Query | — |
| `useRefreshProgress()` | — | `artifacts/mobile/src/features/learn/hooks/useProgress.ts` | — | — |
| `useSubjectCache()` | subject: Subject | undefined, | `artifacts/mobile/src/features/learn/hooks/useSubjectCache.ts` | — | lectureId, isCached, cachedCount, liveCount, isStale, downloadedAt |
| `useProfileData()` | — | `artifacts/mobile/src/features/profile/hooks/useProfileData.ts` | authStore | avatarId, displayName, refresh |
| `useProfileEdit()` | — | `artifacts/mobile/src/features/profile/hooks/useProfileEdit.ts` | authStore | avatarId, nameInput, setNameInput, pickerVisible, setPickerVisible, handleSelectAvatar, handleSave, handleCancel |
| `useMyPurchases()` | — | `artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts` | authStore, React Query | — |
| `usePurchase()` | — | `artifacts/mobile/src/features/purchase/hooks/usePurchase.ts` | purchaseStore | success |
| `useQuizQuestions()` | lectureId: string | `artifacts/mobile/src/features/quiz/hooks/useQuiz.ts` | authStore, React Query | — |
| `useQuizResultsAnimation()` | score: number | `artifacts/mobile/src/features/quiz/hooks/useQuizResultsAnimation.ts` | — | displayScore, ringAnimStyle |
| `useQuizSession()` | lectureId: string | `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts` | authStore, syncStore, React Query, queryClient, supabase | questions, currentIndex, answered, correctCount, finished, submitting, saveError, savedOffline, reviewing, setReviewing, history, isLoading, error, progressStyle, handleSelect, handleNext, handleRetry |
| `useStats()` | userId: string | undefined | `artifacts/mobile/src/features/stats/hooks/useStats.ts` | React Query | — |
| `useColors()` | — | `artifacts/mobile/src/shared/hooks/useColors.ts` | themeStore | ...palette, radius |
| `useFeedback()` | userId: string | undefined | `artifacts/mobile/src/shared/hooks/useFeedback.ts` | supabase | feedbackText, updateText, submitting, feedbackSent, feedbackError, cooldownSecs, isDisabled, isTooShort, handleSubmit |
| `useScreenAnimation()` | scrollRef?: React.RefObject<ScrollView> | `artifacts/mobile/src/shared/hooks/useScreenAnimation.ts` | — | fadeAnim, translateY |
| `usePurchaseActions()` | — | `artifacts/mobile/src/shared/store/purchaseStore.tsx` | purchaseStore, React Query, queryClient, supabase | success |
| `useSyncActions()` | — | `artifacts/mobile/src/shared/store/syncStore.tsx` | authStore, syncStore, React Query, queryClient, supabase | refreshCount, flush |
| `useTheme()` | — | `artifacts/mobile/src/shared/store/themeStore.tsx` | themeStore | theme, setTheme |

