module.exports = [
  {
    "id": "e1",
    "source": "app",
    "target": "error_boundary",
    "type": "wraps",
    "label": "wraps",
    "description": "ErrorBoundary is the outermost wrapper in the provider tree"
  },
  {
    "id": "e2",
    "source": "app",
    "target": "react_query",
    "type": "wraps",
    "label": "provides",
    "description": "QueryClientProvider wraps the entire app with offlineFirst config"
  },
  {
    "id": "e3",
    "source": "app",
    "target": "auth_store",
    "type": "wraps",
    "label": "provides",
    "description": "AuthProvider listens to onAuthStateChange and deep link OAuth callbacks"
  },
  {
    "id": "e4",
    "source": "app",
    "target": "purchase_store",
    "type": "wraps",
    "label": "provides",
    "description": "PurchaseProvider initializes RevenueCat SDK and syncs user identity"
  },
  {
    "id": "e5",
    "source": "app",
    "target": "sync_store",
    "type": "wraps",
    "label": "provides",
    "description": "SyncProvider subscribes to NetInfo and auto-flushes offline queue"
  },
  {
    "id": "e6",
    "source": "app",
    "target": "theme_store",
    "type": "calls",
    "label": "inits theme",
    "description": "ThemeProvider loads saved theme from MMKV on mount"
  },
  {
    "id": "e7",
    "source": "auth_feature",
    "target": "auth_store",
    "type": "calls",
    "label": "triggers sign-in",
    "description": "useAuthForm calls signIn, signUp, signInWithGoogle from auth store"
  },
  {
    "id": "e8",
    "source": "auth_store",
    "target": "supabase_client",
    "type": "calls",
    "label": "auth request",
    "description": "Calls supabase.auth.signInWithPassword, signUp, signInWithOAuth, exchangeCodeForSession, signOut"
  },
  {
    "id": "e9",
    "source": "auth_store",
    "target": "cache_store",
    "type": "calls",
    "label": "clears on sign-out",
    "description": "signOut and onAuthStateChange(null) call useCacheStore.getState().clearAll()"
  },
  {
    "id": "e10",
    "source": "supabase_client",
    "target": "secure_store",
    "type": "writes",
    "label": "chunks session",
    "description": "Custom SecureStoreAdapter stores auth tokens in 1800-byte chunks"
  },
  {
    "id": "e11",
    "source": "supabase_client",
    "target": "supabase_auth",
    "type": "authenticates",
    "label": "authenticates",
    "description": "Communicates with Supabase Auth server for JWT sessions"
  },
  {
    "id": "e12",
    "source": "supabase_client",
    "target": "supabase_db",
    "type": "fetches",
    "label": "reads/writes",
    "description": "Direct PostgREST queries to all tables + RPC calls"
  },
  {
    "id": "e13",
    "source": "auth_store",
    "target": "google_oauth",
    "type": "authenticates",
    "label": "OAuth flow",
    "description": "signInWithGoogle opens expo-web-browser for Google consent, receives code/tokens via redirect"
  },
  {
    "id": "e14",
    "source": "learn_feature",
    "target": "hierarchy_service",
    "type": "calls",
    "label": "fetches hierarchy",
    "description": "useHierarchy hook calls fetchHierarchy for Year→Module→Subject→Lecture tree"
  },
  {
    "id": "e15",
    "source": "learn_feature",
    "target": "access_service",
    "type": "calls",
    "label": "checks access",
    "description": "useModuleAccess hook calls fetchContentAccess to determine paywall state"
  },
  {
    "id": "e16",
    "source": "learn_feature",
    "target": "auth_store",
    "type": "reads",
    "label": "auth guard",
    "description": "useLearnFlow redirects to /login if no session; all hooks read user.id"
  },
  {
    "id": "e17",
    "source": "learn_feature",
    "target": "quiz_feature",
    "type": "navigates",
    "label": "starts quiz",
    "description": "SubjectScreen pushes /quiz/[lectureId] when user taps an accessible lecture"
  },
  {
    "id": "e18",
    "source": "quiz_feature",
    "target": "question_service",
    "type": "calls",
    "label": "fetches questions",
    "description": "useQuizQuestions calls fetchQuestions from questionService"
  },
  {
    "id": "e19",
    "source": "quiz_feature",
    "target": "question_cache",
    "type": "reads",
    "label": "reads cache",
    "description": "useQuizSession pre-loads from SQLite question cache; useQuizQuestions falls back to cache when offline"
  },
  {
    "id": "e20",
    "source": "quiz_feature",
    "target": "supabase_client",
    "type": "calls",
    "label": "saves result online",
    "description": "useQuizSession inserts directly to quiz_results table with 8s timeout when online"
  },
  {
    "id": "e21",
    "source": "quiz_feature",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "useQuizSession reads user.id for quiz result submission"
  },
  {
    "id": "e22",
    "source": "quiz_feature",
    "target": "sync_store",
    "type": "reads",
    "label": "checks online/flushes",
    "description": "useQuizSession reads isOnline to decide save path; calls flush() after fallback-to-queue"
  },
  {
    "id": "e23",
    "source": "quiz_feature",
    "target": "react_query",
    "type": "calls",
    "label": "invalidates queries",
    "description": "useQuizSession invalidates progress, stats, and lectureBestScores queries after quiz completes"
  },
  {
    "id": "e24",
    "source": "stats_feature",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "StatsScreen and MasteryScreen read user.id for data queries"
  },
  {
    "id": "e25",
    "source": "stats_feature",
    "target": "sync_store",
    "type": "reads",
    "label": "reads sync status",
    "description": "StatsScreen reads isOnline and pendingCount to show sync status"
  },
  {
    "id": "e26",
    "source": "stats_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "fetches stats data",
    "description": "Queries user_stats table + RPC get_user_stats_overview + lectures table for name map"
  },
  {
    "id": "e27",
    "source": "stats_service",
    "target": "offline_queue",
    "type": "reads",
    "label": "reads pending results",
    "description": "Reads queue to merge pending offline quiz results into displayed stats"
  },
  {
    "id": "e28",
    "source": "stats_service",
    "target": "hierarchy_service",
    "type": "calls",
    "label": "resolves lecture names",
    "description": "serveFromCache calls fetchHierarchy to build lecture name map for offline display"
  },
  {
    "id": "e29",
    "source": "stats_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to short-circuit to cache when offline"
  },
  {
    "id": "e30",
    "source": "purchase_feature",
    "target": "purchase_store",
    "type": "calls",
    "label": "initiates purchase",
    "description": "usePurchase hook wraps purchaseModule, redeemCode, restoreModule from purchaseStore"
  },
  {
    "id": "e31",
    "source": "purchase_store",
    "target": "supabase_client",
    "type": "calls",
    "label": "RPC call",
    "description": "supabase.rpc('redeem_access_code') for promo code redemption"
  },
  {
    "id": "e32",
    "source": "purchase_store",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "PurchaseProvider reads user.id to logIn/logOut RevenueCat identity"
  },
  {
    "id": "e33",
    "source": "purchase_store",
    "target": "react_query",
    "type": "calls",
    "label": "invalidates queries",
    "description": "invalidateAccess invalidates content_access, my_purchases, hierarchy, quiz queries after purchase"
  },
  {
    "id": "e34",
    "source": "supabase_functions",
    "target": "supabase_db",
    "type": "writes",
    "label": "records transaction",
    "description": "record-iap function validates receipt and inserts into purchases table"
  },
  {
    "id": "e35",
    "source": "profile_feature",
    "target": "auth_store",
    "type": "calls",
    "label": "sign out",
    "description": "AccountActions calls onSignOut (auth_store.signOut) then navigates to /login"
  },
  {
    "id": "e36",
    "source": "profile_feature",
    "target": "theme_store",
    "type": "calls",
    "label": "switches theme",
    "description": "ProfileThemeSelector reads/writes theme via useTheme"
  },
  {
    "id": "e37",
    "source": "profile_feature",
    "target": "sync_store",
    "type": "reads",
    "label": "checks online",
    "description": "AccountActions reads isOnline to gate Clear History (requires network)"
  },
  {
    "id": "e38",
    "source": "profile_feature",
    "target": "supabase_client",
    "type": "calls",
    "label": "deletes data",
    "description": "Clear History deletes from quiz_results and user_stats tables via supabase"
  },
  {
    "id": "e39",
    "source": "profile_feature",
    "target": "stats_service",
    "type": "calls",
    "label": "clears stats cache",
    "description": "AccountActions calls clearAllUserCaches(uid) and reads ZERO_STATS from statsService for the empty state"
  },
  {
    "id": "e40",
    "source": "profile_feature",
    "target": "question_cache",
    "type": "calls",
    "label": "clears downloads",
    "description": "AccountActions calls clearAllLectureCache on Clear Downloaded Lectures"
  },
  {
    "id": "e41",
    "source": "profile_feature",
    "target": "react_query",
    "type": "calls",
    "label": "resets queries",
    "description": "AccountActions zeroes stats/progress/bestScores via setQueriesData, then invalidates"
  },
  {
    "id": "e42",
    "source": "sync_store",
    "target": "supabase_client",
    "type": "calls",
    "label": "syncs data",
    "description": "flush() inserts each queued item to quiz_results, handles Postgres 23505 duplicates, and dead-letters rows past MAX_SYNC_ATTEMPTS"
  },
  {
    "id": "e43",
    "source": "sync_store",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "SyncProvider and useSyncActions read user.id to filter queue and gate flush"
  },
  {
    "id": "e44",
    "source": "sync_store",
    "target": "netinfo",
    "type": "reads",
    "label": "monitors network",
    "description": "SyncProvider subscribes to NetInfo.addEventListener, sets onlineManager.setOnline"
  },
  {
    "id": "e45",
    "source": "sync_store",
    "target": "react_query",
    "type": "calls",
    "label": "invalidates queries",
    "description": "After successful flush, invalidates stats and progress queries"
  },
  {
    "id": "e46",
    "source": "hierarchy_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "fetches 4 tables",
    "description": "Parallel SELECT * from years, modules, subjects, lectures with 10s timeout"
  },
  {
    "id": "e47",
    "source": "hierarchy_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to serve from SQLite cache when offline"
  },
  {
    "id": "e48",
    "source": "access_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "RPC access map",
    "description": "Calls supabase.rpc('get_content_access_map') with 10s timeout"
  },
  {
    "id": "e49",
    "source": "access_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to serve cached access map when offline"
  },
  {
    "id": "e50",
    "source": "progress_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "queries quiz_results",
    "description": "SELECT lecture_id FROM quiz_results with FK auto-detection (6 column candidates)"
  },
  {
    "id": "e51",
    "source": "progress_service",
    "target": "offline_queue",
    "type": "reads",
    "label": "merges pending IDs",
    "description": "Merges queued offline lecture IDs into the completed set"
  },
  {
    "id": "e52",
    "source": "progress_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to serve from the SQLite cache when offline"
  },
  {
    "id": "e53",
    "source": "best_score_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "queries scores",
    "description": "SELECT lecture_id, score FROM quiz_results with 10s timeout"
  },
  {
    "id": "e54",
    "source": "best_score_service",
    "target": "offline_queue",
    "type": "reads",
    "label": "merges pending scores",
    "description": "Merges queued offline quiz scores (takes max) into the score map"
  },
  {
    "id": "e55",
    "source": "best_score_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to serve from the SQLite cache when offline"
  },
  {
    "id": "e56",
    "source": "question_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "queries questions",
    "description": "SELECT * FROM questions with FK auto-detection (7 column candidates) and 6s timeout"
  },
  {
    "id": "e57",
    "source": "question_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to throw 'You are offline' before attempting Supabase call"
  },
  {
    "id": "e58",
    "source": "question_cache",
    "target": "cache_store",
    "type": "calls",
    "label": "bypass flag",
    "description": "Reads/sets questionCacheBypassed flag — set true after clearAllLectureCache, reset on save"
  },
  {
    "id": "e59",
    "source": "purchase_feature",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "useMyPurchases reads user.id to fetch purchase history"
  },
  {
    "id": "e60",
    "source": "purchase_feature",
    "target": "supabase_client",
    "type": "fetches",
    "label": "fetches purchases",
    "description": "useMyPurchases queries purchases table for active purchases with SQLite cache"
  },
  {
    "id": "e61",
    "source": "learn_feature",
    "target": "react_query",
    "type": "calls",
    "label": "uses query",
    "description": "Learn hooks (useHierarchy, useModuleAccess, useProgress, useLectureBestScores) use useQuery"
  },
  {
    "id": "e62",
    "source": "learn_feature",
    "target": "netinfo",
    "type": "reads",
    "label": "checks network",
    "description": "useSubjectCache checks NetInfo.fetch() before allowing offline downloads"
  },
  {
    "id": "e63",
    "source": "purchase_feature",
    "target": "revenuecat",
    "type": "types",
    "label": "types",
    "description": "PurchaseScreen and usePurchase import PurchasesPackage types from revenuecat"
  },
  {
    "id": "e64",
    "source": "purchase_feature",
    "target": "netinfo",
    "type": "reads",
    "label": "checks network",
    "description": "useMyPurchases checks connectivity before fetching purchase history"
  },
  {
    "id": "e65",
    "source": "purchase_feature",
    "target": "react_query",
    "type": "calls",
    "label": "uses query",
    "description": "useMyPurchases uses useQuery for purchase history"
  },
  {
    "id": "e66",
    "source": "stats_feature",
    "target": "react_query",
    "type": "calls",
    "label": "uses query",
    "description": "useStats uses useQuery to fetch user stats"
  },
  {
    "id": "e67",
    "source": "quiz_feature",
    "target": "learn_feature",
    "type": "calls",
    "label": "updates state",
    "description": "useQuizSession imports optimisticallyMarkComplete and optimisticallyUpdateBestScore from learn_feature hooks"
  },
  {
    "id": "e68",
    "source": "stats_feature",
    "target": "learn_feature",
    "type": "navigates",
    "label": "navigates",
    "description": "Empirical edge not previously tracked"
  },
  {
    "id": "e69",
    "source": "auth_feature",
    "target": "error_boundary",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/auth/components/AuthScreen.tsx, artifacts/mobile/src/features/auth/components/AuthScreen.tsx"
  },
  {
    "id": "e70",
    "source": "feedback_form",
    "target": "error_boundary",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/components/FeedbackForm.tsx"
  },
  {
    "id": "e71",
    "source": "learn_feature",
    "target": "error_boundary",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/components/LearnErrorState.tsx, artifacts/mobile/src/features/learn/components/LectureCard.tsx, artifacts/mobile/src/features/learn/components/ModuleCard.tsx, artifacts/mobile/src/features/learn/components/ModuleScreen.tsx, artifacts/mobile/src/features/learn/components/SubjectCard.tsx, artifacts/mobile/src/features/learn/components/SubjectDownloadButton.tsx, artifacts/mobile/src/features/learn/components/SubjectScreen.tsx, artifacts/mobile/src/features/learn/components/YearCard.tsx, artifacts/mobile/src/features/learn/components/YearScreen.tsx"
  },
  {
    "id": "e72",
    "source": "profile_feature",
    "target": "error_boundary",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/profile/components/AccountActions.tsx, artifacts/mobile/src/features/profile/components/AvatarPicker.tsx, artifacts/mobile/src/features/profile/components/EditProfileScreen.tsx, artifacts/mobile/src/features/profile/components/ProfileAvatarSection.tsx, artifacts/mobile/src/features/profile/components/ProfileEditField.tsx, artifacts/mobile/src/features/profile/components/ProfileEditHeader.tsx, artifacts/mobile/src/features/profile/components/ProfileHeroCard.tsx, artifacts/mobile/src/features/profile/components/ProfileScreen.tsx, artifacts/mobile/src/features/profile/components/ProfileThemeSelector.tsx"
  },
  {
    "id": "e73",
    "source": "purchase_feature",
    "target": "error_boundary",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/purchase/components/BuyTab.tsx, artifacts/mobile/src/features/purchase/components/PremiumButton.tsx, artifacts/mobile/src/features/purchase/components/PurchaseScreen.tsx, artifacts/mobile/src/features/purchase/components/SuccessState.tsx, artifacts/mobile/src/features/purchase/components/TabSwitcher.tsx"
  },
  {
    "id": "e74",
    "source": "quiz_feature",
    "target": "error_boundary",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/quiz/components/QuizActiveHeader.tsx, artifacts/mobile/src/features/quiz/components/QuizErrorScreen.tsx, artifacts/mobile/src/features/quiz/components/QuizImage.tsx, artifacts/mobile/src/features/quiz/components/QuizNextButton.tsx, artifacts/mobile/src/features/quiz/components/QuizQuestionContent.tsx, artifacts/mobile/src/features/quiz/components/QuizResultsView.tsx, artifacts/mobile/src/features/quiz/components/QuizReviewScreen.tsx"
  },
  {
    "id": "e75",
    "source": "stats_feature",
    "target": "error_boundary",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/stats/components/MasteryFilterChips.tsx, artifacts/mobile/src/features/stats/components/MasteryHeader.tsx, artifacts/mobile/src/features/stats/components/MasterySearch.tsx, artifacts/mobile/src/features/stats/components/MasterySection.tsx"
  },
  {
    "id": "e76",
    "source": "tab_navigator",
    "target": "error_boundary",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/app/(main)/(tabs)/_layout.tsx"
  },
  {
    "id": "e77",
    "source": "learn_feature",
    "target": "best_score_service",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts, artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts, artifacts/mobile/src/features/learn/index.ts"
  },
  {
    "id": "e78",
    "source": "learn_feature",
    "target": "progress_service",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/hooks/useProgress.ts, artifacts/mobile/src/features/learn/hooks/useProgress.ts, artifacts/mobile/src/features/learn/index.ts"
  },
  {
    "id": "e79",
    "source": "learn_feature",
    "target": "question_cache",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/hooks/useSubjectCache.ts"
  },
  {
    "id": "e80",
    "source": "purchase_store",
    "target": "revenuecat",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/purchaseStore.tsx"
  },
  {
    "id": "e81",
    "source": "question_service",
    "target": "quiz_feature",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/quiz/services/questionService.ts"
  },
  {
    "id": "e82",
    "source": "quiz_feature",
    "target": "offline_queue",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts"
  },
  {
    "id": "e83",
    "source": "stats_feature",
    "target": "stats_service",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/stats/hooks/useStats.ts, artifacts/mobile/src/features/stats/hooks/useStats.ts, artifacts/mobile/src/features/stats/index.ts"
  },
  {
    "id": "e84",
    "source": "sync_store",
    "target": "offline_queue",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/syncStore.tsx"
  },
  {
    "id": "e85",
    "source": "access_service",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/accessService.ts"
  },
  {
    "id": "e86",
    "source": "auth_store",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/authStore.tsx"
  },
  {
    "id": "e87",
    "source": "best_score_service",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/bestScoreService.ts"
  },
  {
    "id": "e88",
    "source": "hierarchy_service",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/hierarchyService.ts"
  },
  {
    "id": "e89",
    "source": "learn_feature",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/hooks/useSubjectCache.ts"
  },
  {
    "id": "e90",
    "source": "progress_service",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/progressService.ts"
  },
  {
    "id": "e91",
    "source": "purchase_feature",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts"
  },
  {
    "id": "e92",
    "source": "question_service",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/quiz/services/questionService.ts"
  },
  {
    "id": "e93",
    "source": "shared_utils",
    "target": "netinfo",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/utils/netInfo.ts"
  },
  {
    "id": "e94",
    "source": "shared_utils",
    "target": "offline_queue",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/utils/cacheUtils.ts"
  },
  {
    "id": "e95",
    "source": "stats_service",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/stats/services/statsService.ts"
  },
  {
    "id": "e96",
    "source": "sync_store",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/syncStore.tsx"
  },
  {
    "id": "e97",
    "source": "offline_banner",
    "target": "sync_store",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/components/OfflineBanner.tsx"
  },
  {
    "id": "e98",
    "source": "access_service",
    "target": "supabase_db",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/accessService.ts"
  },
  {
    "id": "e99",
    "source": "auth_store",
    "target": "supabase_auth",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/authStore.tsx"
  },
  {
    "id": "e100",
    "source": "hierarchy_service",
    "target": "supabase_db",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/hierarchyService.ts"
  },
  {
    "id": "e101",
    "source": "profile_feature",
    "target": "supabase_db",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/profile/components/AccountActions.tsx"
  },
  {
    "id": "e102",
    "source": "purchase_store",
    "target": "supabase_db",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/purchaseStore.tsx"
  },
  {
    "id": "e103",
    "source": "purchase_store",
    "target": "supabase_functions",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/purchaseStore.tsx"
  },
  {
    "id": "e104",
    "source": "quiz_feature",
    "target": "supabase_db",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts"
  },
  {
    "id": "e105",
    "source": "stats_service",
    "target": "supabase_db",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/stats/services/statsService.ts"
  },
  {
    "id": "e106",
    "source": "sync_store",
    "target": "supabase_db",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/syncStore.tsx"
  },
  {
    "id": "e107",
    "source": "profile_feature",
    "target": "shared_utils",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/profile/components/AccountActions.tsx"
  },
  {
    "id": "e108",
    "source": "auth_store",
    "target": "react_query",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/authStore.tsx"
  },
  {
    "id": "e109",
    "source": "access_service",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/accessService.ts, artifacts/mobile/src/features/learn/services/accessService.ts, artifacts/mobile/src/features/learn/services/accessService.ts"
  },
  {
    "id": "e110",
    "source": "access_service",
    "target": "sqlite",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/accessService.ts"
  },
  {
    "id": "e111",
    "source": "app",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/app/_layout.tsx"
  },
  {
    "id": "e112",
    "source": "auth_store",
    "target": "mmkv",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/authStore.tsx"
  },
  {
    "id": "e113",
    "source": "auth_store",
    "target": "zustand",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/authStore.tsx"
  },
  {
    "id": "e114",
    "source": "best_score_service",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/bestScoreService.ts, artifacts/mobile/src/features/learn/services/bestScoreService.ts, artifacts/mobile/src/features/learn/services/bestScoreService.ts"
  },
  {
    "id": "e115",
    "source": "best_score_service",
    "target": "sqlite",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/bestScoreService.ts"
  },
  {
    "id": "e116",
    "source": "cache_store",
    "target": "zustand",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/cacheStore.ts"
  },
  {
    "id": "e117",
    "source": "database",
    "target": "sqlite",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/db/client.ts, artifacts/mobile/src/db/client.ts, artifacts/mobile/src/db/maintenance.ts, artifacts/mobile/src/db/migrate.ts, artifacts/mobile/src/db/rawClient.ts, artifacts/mobile/src/db/repositories/metaRepository.ts, artifacts/mobile/src/db/repositories/questionRepository.ts, artifacts/mobile/src/db/repositories/queueRepository.ts, artifacts/mobile/src/db/schema.ts, artifacts/mobile/src/db/schema.ts, artifacts/mobile/src/db/__tests__/helpers.ts"
  },
  {
    "id": "e118",
    "source": "hierarchy_service",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/hierarchyService.ts, artifacts/mobile/src/features/learn/services/hierarchyService.ts"
  },
  {
    "id": "e119",
    "source": "learn_feature",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts, artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts, artifacts/mobile/src/features/learn/hooks/useProgress.ts, artifacts/mobile/src/features/learn/hooks/useProgress.ts"
  },
  {
    "id": "e120",
    "source": "learn_feature",
    "target": "sqlite",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts, artifacts/mobile/src/features/learn/hooks/useLectureBestScores.ts, artifacts/mobile/src/features/learn/hooks/useProgress.ts, artifacts/mobile/src/features/learn/hooks/useProgress.ts"
  },
  {
    "id": "e121",
    "source": "mmkv",
    "target": "theme_store",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/storage/mmkv.ts"
  },
  {
    "id": "e122",
    "source": "offline_queue",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/services/offlineQueue.ts, artifacts/mobile/src/shared/services/offlineQueue.ts"
  },
  {
    "id": "e123",
    "source": "profile_feature",
    "target": "mmkv",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/profile/hooks/useProfileData.ts, artifacts/mobile/src/features/profile/hooks/useProfileData.ts, artifacts/mobile/src/features/profile/hooks/useProfileEdit.ts, artifacts/mobile/src/features/profile/hooks/useProfileEdit.ts"
  },
  {
    "id": "e124",
    "source": "progress_service",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/progressService.ts, artifacts/mobile/src/features/learn/services/progressService.ts, artifacts/mobile/src/features/learn/services/progressService.ts"
  },
  {
    "id": "e125",
    "source": "progress_service",
    "target": "sqlite",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/learn/services/progressService.ts"
  },
  {
    "id": "e126",
    "source": "purchase_feature",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts, artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts, artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts"
  },
  {
    "id": "e127",
    "source": "purchase_feature",
    "target": "sqlite",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/purchase/hooks/useMyPurchases.ts"
  },
  {
    "id": "e128",
    "source": "purchase_store",
    "target": "zustand",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/purchaseStore.tsx"
  },
  {
    "id": "e129",
    "source": "question_cache",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/quiz/services/questionCache.ts, artifacts/mobile/src/features/quiz/services/questionCache.ts, artifacts/mobile/src/features/quiz/services/questionCache.ts"
  },
  {
    "id": "e130",
    "source": "question_service",
    "target": "mmkv",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/quiz/services/questionService.ts"
  },
  {
    "id": "e131",
    "source": "quiz_feature",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/quiz/hooks/useQuiz.ts"
  },
  {
    "id": "e132",
    "source": "shared_utils",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/utils/cacheUtils.ts, artifacts/mobile/src/shared/utils/cacheUtils.ts"
  },
  {
    "id": "e133",
    "source": "stats_feature",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/stats/hooks/useStats.ts"
  },
  {
    "id": "e134",
    "source": "stats_service",
    "target": "database",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/stats/services/statsService.ts, artifacts/mobile/src/features/stats/services/statsService.ts"
  },
  {
    "id": "e135",
    "source": "stats_service",
    "target": "sqlite",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/stats/services/statsService.ts"
  },
  {
    "id": "e136",
    "source": "sync_store",
    "target": "zustand",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/syncStore.tsx"
  },
  {
    "id": "e137",
    "source": "theme_store",
    "target": "mmkv",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/shared/store/themeStore.tsx, artifacts/mobile/src/shared/store/themeStore.tsx"
  },
  {
    "id": "e138",
    "source": "stats_service",
    "target": "stats_feature",
    "type": "calls",
    "label": "calls",
    "description": "Auto-discovered: artifacts/mobile/src/features/stats/services/statsService.ts, artifacts/mobile/src/features/stats/services/statsService.ts"
  },
  {
    "source": "react_query",
    "target": "theme_store",
    "label": "Flow triggers"
  },
  {
    "source": "theme_store",
    "target": "auth_store",
    "label": "Flow triggers"
  },
  {
    "source": "secure_store",
    "target": "purchase_store",
    "label": "Flow triggers"
  },
  {
    "source": "purchase_store",
    "target": "sync_store",
    "label": "Flow triggers"
  },
  {
    "source": "sync_store",
    "target": "app",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_auth",
    "target": "secure_store",
    "label": "Flow triggers"
  },
  {
    "source": "secure_store",
    "target": "auth_store",
    "label": "Flow triggers"
  },
  {
    "source": "auth_store",
    "target": "auth_feature",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_client",
    "target": "google_oauth",
    "label": "Flow triggers"
  },
  {
    "source": "google_oauth",
    "target": "auth_store",
    "label": "Flow triggers"
  },
  {
    "source": "auth_store",
    "target": "supabase_auth",
    "label": "Flow triggers"
  },
  {
    "source": "secure_store",
    "target": "auth_feature",
    "label": "Flow triggers"
  },
  {
    "source": "netinfo",
    "target": "hierarchy_service",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_db",
    "target": "hierarchy_service",
    "label": "Flow triggers"
  },
  {
    "source": "hierarchy_service",
    "target": "progress_service",
    "label": "Flow triggers"
  },
  {
    "source": "progress_service",
    "target": "best_score_service",
    "label": "Flow triggers"
  },
  {
    "source": "best_score_service",
    "target": "access_service",
    "label": "Flow triggers"
  },
  {
    "source": "access_service",
    "target": "learn_feature",
    "label": "Flow triggers"
  },
  {
    "source": "question_cache",
    "target": "question_service",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_client",
    "target": "question_cache",
    "label": "Flow triggers"
  },
  {
    "source": "question_cache",
    "target": "quiz_feature",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_db",
    "target": "best_score_service",
    "label": "Flow triggers"
  },
  {
    "source": "best_score_service",
    "target": "react_query",
    "label": "Flow triggers"
  },
  {
    "source": "react_query",
    "target": "quiz_feature",
    "label": "Flow triggers"
  },
  {
    "source": "auth_store",
    "target": "purchase_store",
    "label": "Flow triggers"
  },
  {
    "source": "purchase_store",
    "target": "auth_feature",
    "label": "Flow triggers"
  },
  {
    "source": "secure_store",
    "target": "cache_store",
    "label": "Flow triggers"
  },
  {
    "source": "cache_store",
    "target": "progress_service",
    "label": "Flow triggers"
  },
  {
    "source": "best_score_service",
    "target": "purchase_store",
    "label": "Flow triggers"
  },
  {
    "source": "purchase_store",
    "target": "profile_feature",
    "label": "Flow triggers"
  },
  {
    "source": "netinfo",
    "target": "learn_feature",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_db",
    "target": "question_cache",
    "label": "Flow triggers"
  },
  {
    "source": "question_cache",
    "target": "learn_feature",
    "label": "Flow triggers"
  },
  {
    "source": "revenuecat",
    "target": "purchase_store",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_db",
    "target": "react_query",
    "label": "Flow triggers"
  },
  {
    "source": "react_query",
    "target": "purchase_feature",
    "label": "Flow triggers"
  },
  {
    "source": "netinfo",
    "target": "sync_store",
    "label": "Flow triggers"
  },
  {
    "source": "offline_queue",
    "target": "sync_store",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_db",
    "target": "offline_queue",
    "label": "Flow triggers"
  },
  {
    "source": "offline_queue",
    "target": "react_query",
    "label": "Flow triggers"
  },
  {
    "source": "react_query",
    "target": "sync_store",
    "label": "Flow triggers"
  },
  {
    "source": "cache_store",
    "target": "stats_service",
    "label": "Flow triggers"
  },
  {
    "source": "netinfo",
    "target": "supabase_client",
    "label": "Flow triggers"
  },
  {
    "source": "offline_queue",
    "target": "stats_service",
    "label": "Flow triggers"
  },
  {
    "source": "theme_store",
    "target": "app",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_db",
    "target": "feedback_form",
    "label": "Flow triggers"
  },
  {
    "source": "supabase_db",
    "target": "stats_service",
    "label": "Flow triggers"
  },
  {
    "source": "stats_service",
    "target": "progress_service",
    "label": "Flow triggers"
  },
  {
    "source": "react_query",
    "target": "profile_feature",
    "label": "Flow triggers"
  },
  {
    "source": "hierarchy_service",
    "target": "stats_feature",
    "label": "Flow triggers"
  },
  {
    "source": "quiz_feature",
    "target": "app",
    "label": "Flow triggers"
  }
];
