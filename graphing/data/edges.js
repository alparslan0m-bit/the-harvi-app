module.exports = [
  {
    "id": "e1",
    "source": "app",
    "target": "auth_feature",
    "type": "navigates",
    "label": "navigates to",
    "description": "Stack.Screen (auth)/login — shown when no session"
  },
  {
    "id": "e2",
    "source": "app",
    "target": "tab_navigator",
    "type": "navigates",
    "label": "navigates to",
    "description": "Stack.Screen (main)/(tabs) — main authenticated app"
  },
  {
    "id": "e3",
    "source": "app",
    "target": "quiz_feature",
    "type": "navigates",
    "label": "navigates to",
    "description": "Stack.Screen (main)/quiz/[lectureId] — full-screen quiz"
  },
  {
    "id": "e4",
    "source": "app",
    "target": "purchase_feature",
    "type": "navigates",
    "label": "navigates to",
    "description": "Stack.Screen (main)/purchase/[moduleId] — presented as modal"
  },
  {
    "id": "e5",
    "source": "app",
    "target": "error_boundary",
    "type": "wraps",
    "label": "wraps",
    "description": "ErrorBoundary is the outermost wrapper in the provider tree"
  },
  {
    "id": "e6",
    "source": "app",
    "target": "react_query",
    "type": "wraps",
    "label": "provides",
    "description": "QueryClientProvider wraps the entire app with offlineFirst config"
  },
  {
    "id": "e7",
    "source": "app",
    "target": "auth_store",
    "type": "wraps",
    "label": "provides",
    "description": "AuthProvider listens to onAuthStateChange and deep link OAuth callbacks"
  },
  {
    "id": "e8",
    "source": "app",
    "target": "purchase_store",
    "type": "wraps",
    "label": "provides",
    "description": "PurchaseProvider initializes RevenueCat SDK and syncs user identity"
  },
  {
    "id": "e9",
    "source": "app",
    "target": "sync_store",
    "type": "wraps",
    "label": "provides",
    "description": "SyncProvider subscribes to NetInfo and auto-flushes offline queue"
  },
  {
    "id": "e10",
    "source": "app",
    "target": "theme_store",
    "type": "calls",
    "label": "inits theme",
    "description": "ThemeProvider loads saved theme from AsyncStorage on mount"
  },
  {
    "id": "e11",
    "source": "tab_navigator",
    "target": "learn_feature",
    "type": "navigates",
    "label": "Learn tab",
    "description": "First tab: (learn) group with book-open icon"
  },
  {
    "id": "e12",
    "source": "tab_navigator",
    "target": "stats_feature",
    "type": "navigates",
    "label": "Stats tab",
    "description": "Second tab: stats screen with bar-chart icon"
  },
  {
    "id": "e13",
    "source": "tab_navigator",
    "target": "profile_feature",
    "type": "navigates",
    "label": "Profile tab",
    "description": "Third tab: profile screen with user icon"
  },
  {
    "id": "e14",
    "source": "auth_feature",
    "target": "auth_store",
    "type": "calls",
    "label": "triggers sign-in",
    "description": "useAuthForm calls signIn, signUp, signInWithGoogle from auth store"
  },
  {
    "id": "e15",
    "source": "auth_store",
    "target": "supabase_client",
    "type": "calls",
    "label": "auth request",
    "description": "Calls supabase.auth.signInWithPassword, signUp, signInWithOAuth, exchangeCodeForSession, signOut"
  },
  {
    "id": "e16",
    "source": "auth_store",
    "target": "cache_store",
    "type": "calls",
    "label": "clears on sign-out",
    "description": "signOut and onAuthStateChange(null) call useCacheStore.getState().clearAll()"
  },
  {
    "id": "e17",
    "source": "auth_store",
    "target": "progress_service",
    "type": "calls",
    "label": "clears on sign-out",
    "description": "signOut clears progressService memCache and warmed set"
  },
  {
    "id": "e18",
    "source": "auth_store",
    "target": "best_score_service",
    "type": "calls",
    "label": "clears on sign-out",
    "description": "signOut clears bestScoreService memCache and warmed set"
  },
  {
    "id": "e19",
    "source": "supabase_client",
    "target": "secure_store",
    "type": "writes",
    "label": "chunks session",
    "description": "Custom SecureStoreAdapter stores auth tokens in 1800-byte chunks"
  },
  {
    "id": "e20",
    "source": "supabase_client",
    "target": "supabase_auth",
    "type": "authenticates",
    "label": "authenticates",
    "description": "Communicates with Supabase Auth server for JWT sessions"
  },
  {
    "id": "e21",
    "source": "supabase_client",
    "target": "supabase_db",
    "type": "fetches",
    "label": "reads/writes",
    "description": "Direct PostgREST queries to all tables + RPC calls"
  },
  {
    "id": "e22",
    "source": "auth_store",
    "target": "google_oauth",
    "type": "authenticates",
    "label": "OAuth flow",
    "description": "signInWithGoogle opens expo-web-browser for Google consent, receives code/tokens via redirect"
  },
  {
    "id": "e23",
    "source": "learn_feature",
    "target": "hierarchy_service",
    "type": "calls",
    "label": "fetches hierarchy",
    "description": "useHierarchy hook calls fetchHierarchy for Year→Module→Subject→Lecture tree"
  },
  {
    "id": "e24",
    "source": "learn_feature",
    "target": "access_service",
    "type": "calls",
    "label": "checks access",
    "description": "useModuleAccess hook calls fetchContentAccess to determine paywall state"
  },
  {
    "id": "e25",
    "source": "learn_feature",
    "target": "progress_service",
    "type": "reads",
    "label": "reads progress",
    "description": "useProgress returns Set<lectureId> of completed lectures for badge display"
  },
  {
    "id": "e26",
    "source": "learn_feature",
    "target": "best_score_service",
    "type": "reads",
    "label": "reads best scores",
    "description": "useLectureBestScores returns Map<lectureId, score%> for star ratings on lecture cards"
  },
  {
    "id": "e27",
    "source": "learn_feature",
    "target": "question_service",
    "type": "calls",
    "label": "downloads questions",
    "description": "useSubjectCache calls fetchQuestions for each lecture during offline download"
  },
  {
    "id": "e28",
    "source": "learn_feature",
    "target": "question_cache",
    "type": "writes",
    "label": "saves to cache",
    "description": "useSubjectCache calls saveQuestionsToCache after downloading each lecture's questions"
  },
  {
    "id": "e29",
    "source": "learn_feature",
    "target": "auth_store",
    "type": "reads",
    "label": "auth guard",
    "description": "useLearnFlow redirects to /login if no session; all hooks read user.id"
  },
  {
    "id": "e30",
    "source": "learn_feature",
    "target": "purchase_feature",
    "type": "navigates",
    "label": "navigates to paywall",
    "description": "SubjectScreen pushes /purchase/[moduleId] when user taps a locked lecture"
  },
  {
    "id": "e31",
    "source": "learn_feature",
    "target": "quiz_feature",
    "type": "navigates",
    "label": "starts quiz",
    "description": "SubjectScreen pushes /quiz/[lectureId] when user taps an accessible lecture"
  },
  {
    "id": "e32",
    "source": "quiz_feature",
    "target": "question_service",
    "type": "calls",
    "label": "fetches questions",
    "description": "useQuizQuestions calls fetchQuestions from questionService"
  },
  {
    "id": "e33",
    "source": "quiz_feature",
    "target": "question_cache",
    "type": "reads",
    "label": "reads cache",
    "description": "useQuizSession pre-loads from AsyncStorage cache; useQuizQuestions falls back to cache when offline"
  },
  {
    "id": "e34",
    "source": "quiz_feature",
    "target": "offline_queue",
    "type": "writes",
    "label": "enqueues result",
    "description": "useQuizSession enqueues quiz result when offline or when online insert fails (fallback)"
  },
  {
    "id": "e35",
    "source": "quiz_feature",
    "target": "supabase_client",
    "type": "calls",
    "label": "saves result online",
    "description": "useQuizSession inserts directly to quiz_results table with 8s timeout when online"
  },
  {
    "id": "e36",
    "source": "quiz_feature",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "useQuizSession reads user.id for quiz result submission"
  },
  {
    "id": "e37",
    "source": "quiz_feature",
    "target": "sync_store",
    "type": "reads",
    "label": "checks online/flushes",
    "description": "useQuizSession reads isOnline to decide save path; calls flush() after fallback-to-queue"
  },
  {
    "id": "e38",
    "source": "quiz_feature",
    "target": "progress_service",
    "type": "calls",
    "label": "marks complete",
    "description": "useQuizSession calls optimisticallyMarkComplete after quiz finishes"
  },
  {
    "id": "e39",
    "source": "quiz_feature",
    "target": "best_score_service",
    "type": "calls",
    "label": "updates best score",
    "description": "useQuizSession calls optimisticallyUpdateBestScore after quiz finishes"
  },
  {
    "id": "e40",
    "source": "quiz_feature",
    "target": "react_query",
    "type": "calls",
    "label": "invalidates queries",
    "description": "useQuizSession invalidates progress, stats, and lectureBestScores queries after quiz completes"
  },
  {
    "id": "e41",
    "source": "stats_feature",
    "target": "stats_service",
    "type": "calls",
    "label": "fetches stats",
    "description": "useStats hook calls fetchStats from statsService"
  },
  {
    "id": "e42",
    "source": "stats_feature",
    "target": "cache_store",
    "type": "reads",
    "label": "reads cached stats",
    "description": "useStats reads statsCache from cacheStore for synchronous initialData (no loading spinner)"
  },
  {
    "id": "e43",
    "source": "stats_feature",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "StatsScreen and MasteryScreen read user.id for data queries"
  },
  {
    "id": "e44",
    "source": "stats_feature",
    "target": "sync_store",
    "type": "reads",
    "label": "reads sync status",
    "description": "StatsScreen reads isOnline and pendingCount to show sync status"
  },
  {
    "id": "e45",
    "source": "stats_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "fetches stats data",
    "description": "Queries user_stats table + RPC get_user_stats_overview + lectures table for name map"
  },
  {
    "id": "e46",
    "source": "stats_service",
    "target": "cache_store",
    "type": "writes",
    "label": "updates cache",
    "description": "writeCache sets stats in cacheStore.setStatsCache for synchronous access"
  },
  {
    "id": "e47",
    "source": "stats_service",
    "target": "async_storage",
    "type": "writes",
    "label": "persists stats",
    "description": "Writes UserStats to AsyncStorage (harvi:stats:{userId}) for offline access"
  },
  {
    "id": "e48",
    "source": "stats_service",
    "target": "offline_queue",
    "type": "reads",
    "label": "reads pending results",
    "description": "Reads queue to merge pending offline quiz results into displayed stats"
  },
  {
    "id": "e49",
    "source": "stats_service",
    "target": "hierarchy_service",
    "type": "calls",
    "label": "resolves lecture names",
    "description": "serveFromCache calls fetchHierarchy to build lecture name map for offline display"
  },
  {
    "id": "e50",
    "source": "stats_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to short-circuit to cache when offline"
  },
  {
    "id": "e51",
    "source": "purchase_feature",
    "target": "purchase_store",
    "type": "calls",
    "label": "initiates purchase",
    "description": "usePurchase hook wraps purchaseModule, redeemCode, restoreModule from purchaseStore"
  },
  {
    "id": "e52",
    "source": "purchase_store",
    "target": "revenuecat",
    "type": "calls",
    "label": "processes native IAP",
    "description": "Purchases.purchasePackage, restorePurchases, logIn/logOut via RevenueCat SDK"
  },
  {
    "id": "e53",
    "source": "purchase_store",
    "target": "supabase_functions",
    "type": "calls",
    "label": "invokes edge function",
    "description": "supabase.functions.invoke('record-iap') with moduleId, transactionId, store"
  },
  {
    "id": "e54",
    "source": "purchase_store",
    "target": "supabase_client",
    "type": "calls",
    "label": "RPC call",
    "description": "supabase.rpc('redeem_access_code') for promo code redemption"
  },
  {
    "id": "e55",
    "source": "purchase_store",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "PurchaseProvider reads user.id to logIn/logOut RevenueCat identity"
  },
  {
    "id": "e56",
    "source": "purchase_store",
    "target": "react_query",
    "type": "calls",
    "label": "invalidates queries",
    "description": "invalidateAccess invalidates content_access, my_purchases, hierarchy, quiz queries after purchase"
  },
  {
    "id": "e57",
    "source": "supabase_functions",
    "target": "supabase_db",
    "type": "writes",
    "label": "records transaction",
    "description": "record-iap function validates receipt and inserts into purchases table"
  },
  {
    "id": "e58",
    "source": "profile_feature",
    "target": "auth_store",
    "type": "calls",
    "label": "sign out",
    "description": "AccountActions calls onSignOut (auth_store.signOut) then navigates to /login"
  },
  {
    "id": "e59",
    "source": "profile_feature",
    "target": "async_storage",
    "type": "reads",
    "label": "reads profile",
    "description": "useProfileData reads harvi:avatar and harvi:displayName from AsyncStorage"
  },
  {
    "id": "e60",
    "source": "profile_feature",
    "target": "async_storage",
    "type": "writes",
    "label": "saves profile",
    "description": "useProfileEdit writes avatar and displayName to AsyncStorage"
  },
  {
    "id": "e61",
    "source": "profile_feature",
    "target": "theme_store",
    "type": "calls",
    "label": "switches theme",
    "description": "ProfileThemeSelector reads/writes theme via useTheme"
  },
  {
    "id": "e62",
    "source": "profile_feature",
    "target": "sync_store",
    "type": "reads",
    "label": "checks online",
    "description": "AccountActions reads isOnline to gate Clear History (requires network)"
  },
  {
    "id": "e63",
    "source": "profile_feature",
    "target": "supabase_client",
    "type": "calls",
    "label": "deletes data",
    "description": "Clear History deletes from quiz_results and user_stats tables via supabase"
  },
  {
    "id": "e64",
    "source": "profile_feature",
    "target": "stats_service",
    "type": "calls",
    "label": "clears stats cache",
    "description": "AccountActions calls clearStatsCache and uses ZERO_STATS constant"
  },
  {
    "id": "e65",
    "source": "profile_feature",
    "target": "progress_service",
    "type": "calls",
    "label": "clears progress",
    "description": "AccountActions calls clearProgressCache on Clear History"
  },
  {
    "id": "e66",
    "source": "profile_feature",
    "target": "best_score_service",
    "type": "calls",
    "label": "clears scores",
    "description": "AccountActions calls clearBestScoreCache on Clear History"
  },
  {
    "id": "e67",
    "source": "profile_feature",
    "target": "question_cache",
    "type": "calls",
    "label": "clears downloads",
    "description": "AccountActions calls clearAllLectureCache on Clear Downloaded Lectures"
  },
  {
    "id": "e68",
    "source": "profile_feature",
    "target": "offline_queue",
    "type": "calls",
    "label": "clears queue",
    "description": "AccountActions calls clearQueueForUser on Clear History"
  },
  {
    "id": "e69",
    "source": "profile_feature",
    "target": "feedback_form",
    "type": "renders",
    "label": "renders",
    "description": "ProfileScreen renders FeedbackForm component with user.id"
  },
  {
    "id": "e70",
    "source": "profile_feature",
    "target": "react_query",
    "type": "calls",
    "label": "resets queries",
    "description": "AccountActions zeroes stats/progress/bestScores via setQueriesData, then invalidates"
  },
  {
    "id": "e71",
    "source": "feedback_form",
    "target": "supabase_client",
    "type": "calls",
    "label": "submits feedback",
    "description": "useFeedback hook inserts to 'feedback' table via supabase"
  },
  {
    "id": "e72",
    "source": "feedback_form",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "useFeedback checks NetInfo before submission, blocks when offline"
  },
  {
    "id": "e73",
    "source": "sync_store",
    "target": "offline_queue",
    "type": "reads",
    "label": "reads queue",
    "description": "useSyncActions.flush reads queue, filters by userId, processes items with 10s timeout"
  },
  {
    "id": "e74",
    "source": "sync_store",
    "target": "supabase_client",
    "type": "calls",
    "label": "syncs data",
    "description": "flush() inserts each queued item to quiz_results, handles duplicate errors (23xxx codes)"
  },
  {
    "id": "e75",
    "source": "sync_store",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "SyncProvider and useSyncActions read user.id to filter queue and gate flush"
  },
  {
    "id": "e76",
    "source": "sync_store",
    "target": "netinfo",
    "type": "reads",
    "label": "monitors network",
    "description": "SyncProvider subscribes to NetInfo.addEventListener, sets onlineManager.setOnline"
  },
  {
    "id": "e77",
    "source": "sync_store",
    "target": "react_query",
    "type": "calls",
    "label": "invalidates queries",
    "description": "After successful flush, invalidates stats and progress queries"
  },
  {
    "id": "e78",
    "source": "hierarchy_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "fetches 4 tables",
    "description": "Parallel SELECT * from years, modules, subjects, lectures with 10s timeout"
  },
  {
    "id": "e79",
    "source": "hierarchy_service",
    "target": "async_storage",
    "type": "writes",
    "label": "caches hierarchy",
    "description": "Writes full Year[] tree to AsyncStorage (harvi:hierarchy) for offline access"
  },
  {
    "id": "e80",
    "source": "hierarchy_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to serve from AsyncStorage cache when offline"
  },
  {
    "id": "e81",
    "source": "access_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "RPC access map",
    "description": "Calls supabase.rpc('get_content_access_map') with 10s timeout"
  },
  {
    "id": "e82",
    "source": "access_service",
    "target": "async_storage",
    "type": "writes",
    "label": "caches access",
    "description": "Writes access Map to AsyncStorage (harvi:access:{userId}) for offline"
  },
  {
    "id": "e83",
    "source": "access_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to serve cached access map when offline"
  },
  {
    "id": "e84",
    "source": "progress_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "queries quiz_results",
    "description": "SELECT lecture_id FROM quiz_results with FK auto-detection (6 column candidates)"
  },
  {
    "id": "e85",
    "source": "progress_service",
    "target": "async_storage",
    "type": "writes",
    "label": "caches progress",
    "description": "Writes completed lecture IDs to AsyncStorage (harvi:progress:{userId})"
  },
  {
    "id": "e86",
    "source": "progress_service",
    "target": "offline_queue",
    "type": "reads",
    "label": "merges pending IDs",
    "description": "Merges queued offline lecture IDs into the completed set"
  },
  {
    "id": "e87",
    "source": "progress_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to serve from memCache/AsyncStorage when offline"
  },
  {
    "id": "e88",
    "source": "best_score_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "queries scores",
    "description": "SELECT lecture_id, score FROM quiz_results with 10s timeout"
  },
  {
    "id": "e89",
    "source": "best_score_service",
    "target": "async_storage",
    "type": "writes",
    "label": "caches scores",
    "description": "Writes Map<lectureId, score> entries to AsyncStorage (harvi:bestScores:{userId})"
  },
  {
    "id": "e90",
    "source": "best_score_service",
    "target": "offline_queue",
    "type": "reads",
    "label": "merges pending scores",
    "description": "Merges queued offline quiz scores (takes max) into the score map"
  },
  {
    "id": "e91",
    "source": "best_score_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to serve from memCache/AsyncStorage when offline"
  },
  {
    "id": "e92",
    "source": "question_service",
    "target": "supabase_client",
    "type": "fetches",
    "label": "queries questions",
    "description": "SELECT * FROM questions with FK auto-detection (7 column candidates) and 6s timeout"
  },
  {
    "id": "e93",
    "source": "question_service",
    "target": "async_storage",
    "type": "writes",
    "label": "caches FK column",
    "description": "Persists discovered FK column name (harvi:quiz:fkcol) to skip detection on next load"
  },
  {
    "id": "e94",
    "source": "question_service",
    "target": "netinfo",
    "type": "reads",
    "label": "checks connectivity",
    "description": "NetInfo.fetch() to throw 'You are offline' before attempting Supabase call"
  },
  {
    "id": "e95",
    "source": "question_cache",
    "target": "async_storage",
    "type": "writes",
    "label": "persists questions",
    "description": "Stores/loads per-lecture question cache (harvi:qcache:{lectureId}) as CachedLecture JSON"
  },
  {
    "id": "e96",
    "source": "question_cache",
    "target": "cache_store",
    "type": "calls",
    "label": "bypass flag",
    "description": "Reads/sets questionCacheBypassed flag — set true after clearAllLectureCache, reset on save"
  },
  {
    "id": "e97",
    "source": "offline_queue",
    "target": "async_storage",
    "type": "writes",
    "label": "persists queue",
    "description": "Writes PendingQuizResult[] to AsyncStorage (harvi:quiz_queue) with retry-once on failure"
  },
  {
    "id": "e98",
    "source": "theme_store",
    "target": "async_storage",
    "type": "writes",
    "label": "saves theme",
    "description": "Persists theme choice (harvi:theme) to AsyncStorage on setTheme"
  },
  {
    "id": "e99",
    "source": "purchase_feature",
    "target": "auth_store",
    "type": "reads",
    "label": "reads user",
    "description": "useMyPurchases reads user.id to fetch purchase history"
  },
  {
    "id": "e100",
    "source": "purchase_feature",
    "target": "supabase_client",
    "type": "fetches",
    "label": "fetches purchases",
    "description": "useMyPurchases queries purchases table for active purchases with AsyncStorage cache"
  },
  {
    "id": "e101",
    "source": "learn_feature",
    "target": "react_query",
    "type": "calls",
    "label": "uses query",
    "description": "Learn hooks (useHierarchy, useModuleAccess, useProgress, useLectureBestScores) use useQuery"
  },
  {
    "id": "e102",
    "source": "learn_feature",
    "target": "netinfo",
    "type": "reads",
    "label": "checks network",
    "description": "useSubjectCache checks NetInfo.fetch() before allowing offline downloads"
  },
  {
    "id": "e103",
    "source": "purchase_feature",
    "target": "revenuecat",
    "type": "types",
    "label": "types",
    "description": "PurchaseScreen and usePurchase import PurchasesPackage types from revenuecat"
  },
  {
    "id": "e104",
    "source": "purchase_feature",
    "target": "async_storage",
    "type": "reads",
    "label": "caches purchases",
    "description": "useMyPurchases caches history to AsyncStorage for offline access"
  },
  {
    "id": "e105",
    "source": "purchase_feature",
    "target": "netinfo",
    "type": "reads",
    "label": "checks network",
    "description": "useMyPurchases checks connectivity before fetching purchase history"
  },
  {
    "id": "e106",
    "source": "purchase_feature",
    "target": "react_query",
    "type": "calls",
    "label": "uses query",
    "description": "useMyPurchases uses useQuery for purchase history"
  },
  {
    "id": "e107",
    "source": "stats_feature",
    "target": "react_query",
    "type": "calls",
    "label": "uses query",
    "description": "useStats uses useQuery to fetch user stats"
  },
  {
    "id": "e108",
    "source": "profile_feature",
    "target": "stats_feature",
    "type": "calls",
    "label": "clears cache",
    "description": "AccountActions imports clearStatsCache from stats_feature for Clear History"
  },
  {
    "id": "e109",
    "source": "profile_feature",
    "target": "learn_feature",
    "type": "calls",
    "label": "clears cache",
    "description": "AccountActions imports clearProgressCache and clearBestScoreCache from learn_feature"
  },
  {
    "id": "e110",
    "source": "quiz_feature",
    "target": "learn_feature",
    "type": "calls",
    "label": "updates state",
    "description": "useQuizSession imports optimisticallyMarkComplete and optimisticallyUpdateBestScore from learn_feature hooks"
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
    "source": "async_storage",
    "target": "progress_service",
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
    "source": "cache_store",
    "target": "async_storage",
    "label": "Flow triggers"
  },
  {
    "source": "async_storage",
    "target": "stats_feature",
    "label": "Flow triggers"
  },
  {
    "source": "async_storage",
    "target": "profile_feature",
    "label": "Flow triggers"
  },
  {
    "source": "async_storage",
    "target": "theme_store",
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
    "source": "async_storage",
    "target": "react_query",
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