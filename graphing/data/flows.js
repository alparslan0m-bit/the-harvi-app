module.exports = [
  {
    id: "app-startup",
    name: "App Startup",
    description:
      "Initialization sequence when the app launches: loads fonts, restores auth session, initializes theme and purchases, subscribes to network",
    steps: [
      {
        order: 1,
        node: "app",
        action:
          "Loads Inter and Nunito fonts, prevents splash screen auto-hide",
      },
      {
        order: 2,
        node: "react_query",
        action: "QueryClientProvider initialized with offlineFirst config",
      },
      {
        order: 3,
        node: "theme_store",
        action: "ThemeProvider loads saved theme from AsyncStorage",
      },
      {
        order: 4,
        node: "auth_store",
        action:
          "AuthProvider calls supabase.auth.getSession() and subscribes to onAuthStateChange",
      },
      {
        order: 5,
        node: "supabase_client",
        action: "Reads chunked session tokens from SecureStore",
      },
      {
        order: 6,
        node: "secure_store",
        action: "Returns reassembled session JWT",
      },
      {
        order: 7,
        node: "purchase_store",
        action:
          "PurchaseProvider initializes RevenueCat SDK and syncs user identity",
      },
      {
        order: 8,
        node: "sync_store",
        action:
          "SyncProvider subscribes to NetInfo, checks pending queue, auto-flushes if online",
      },
      {
        order: 9,
        node: "app",
        action:
          "Hides splash screen once fonts loaded and auth resolved, renders Stack navigator",
      },
    ],
  },
  {
    id: "user-login-email",
    name: "Email Login",
    description:
      "Authenticates a user with email and password and establishes an application session",
    steps: [
      {
        order: 1,
        node: "auth_feature",
        action: "User enters email and password on AuthScreen",
      },
      {
        order: 2,
        node: "auth_store",
        action: "useAuthForm calls signIn(email, password)",
      },
      {
        order: 3,
        node: "supabase_client",
        action: "Calls supabase.auth.signInWithPassword",
      },
      {
        order: 4,
        node: "supabase_auth",
        action: "Validates credentials, returns JWT session",
      },
      {
        order: 5,
        node: "secure_store",
        action: "SecureStoreAdapter chunks and stores session tokens",
      },
      {
        order: 6,
        node: "auth_store",
        action: "onAuthStateChange fires, sets session/user state",
      },
      {
        order: 7,
        node: "auth_feature",
        action: "useAuthForm calls router.replace('/(tabs)') on success",
      },
    ],
  },
  {
    id: "user-login-google",
    name: "Google OAuth Login",
    description:
      "Authenticates via Google OAuth using expo-web-browser and Supabase",
    steps: [
      {
        order: 1,
        node: "auth_feature",
        action: "User taps 'Continue with Google' button",
      },
      {
        order: 2,
        node: "auth_store",
        action: "signInWithGoogle creates redirect URL via expo-linking",
      },
      {
        order: 3,
        node: "supabase_client",
        action: "Calls supabase.auth.signInWithOAuth with Google provider",
      },
      {
        order: 4,
        node: "google_oauth",
        action: "Opens browser session for Google consent (select_account)",
      },
      {
        order: 5,
        node: "auth_store",
        action:
          "Receives redirect URL, extracts code, calls exchangeCodeForSession",
      },
      {
        order: 6,
        node: "supabase_auth",
        action: "Exchanges authorization code for JWT session",
      },
      {
        order: 7,
        node: "secure_store",
        action: "Stores chunked session tokens",
      },
      {
        order: 8,
        node: "auth_feature",
        action: "Navigates to main tabs on success",
      },
    ],
  },
  {
    id: "offline-first-learn",
    name: "Offline-First Content Browsing",
    description:
      "Loads the Year→Module→Subject→Lecture hierarchy, preferring cache when offline. Shows completion badges and best scores",
    steps: [
      {
        order: 1,
        node: "learn_feature",
        action: "User opens Learn tab, useHierarchy triggers fetchHierarchy",
      },
      {
        order: 2,
        node: "hierarchy_service",
        action: "Checks NetInfo connectivity",
      },
      {
        order: 3,
        node: "netinfo",
        action: "Returns connectivity state",
      },
      {
        order: 4,
        node: "hierarchy_service",
        action:
          "If offline: returns AsyncStorage cache. If online: fetches from Supabase",
      },
      {
        order: 5,
        node: "supabase_client",
        action: "Parallel SELECT * from years, modules, subjects, lectures",
      },
      {
        order: 6,
        node: "supabase_db",
        action: "Returns all hierarchy data",
      },
      {
        order: 7,
        node: "hierarchy_service",
        action:
          "Builds nested tree with FK auto-detection, caches to AsyncStorage",
      },
      {
        order: 8,
        node: "progress_service",
        action: "useProgress returns Set<lectureId> of completed lectures",
      },
      {
        order: 9,
        node: "best_score_service",
        action: "useLectureBestScores returns Map<lectureId, score%>",
      },
      {
        order: 10,
        node: "access_service",
        action: "useModuleAccess returns access map with paywall info",
      },
      {
        order: 11,
        node: "learn_feature",
        action:
          "Renders year cards → module cards → subject cards → lecture cards with progress/score/lock indicators",
      },
    ],
  },
  {
    id: "online-quiz-taking",
    name: "Online Quiz Taking",
    description:
      "User takes a quiz while online — saves result directly to Supabase, updates all caches optimistically",
    steps: [
      {
        order: 1,
        node: "learn_feature",
        action: "User taps accessible lecture in SubjectScreen",
      },
      {
        order: 2,
        node: "quiz_feature",
        action: "QuizScreen mounts, useQuizSession initializes",
      },
      {
        order: 3,
        node: "question_cache",
        action: "Pre-loads questions from AsyncStorage cache (fast path)",
      },
      {
        order: 4,
        node: "question_service",
        action:
          "useQuizQuestions fetches fresh questions from Supabase in background",
      },
      {
        order: 5,
        node: "supabase_client",
        action: "SELECT * FROM questions WHERE lecture_id = ?",
      },
      {
        order: 6,
        node: "question_cache",
        action: "Auto-updates cache with fresh questions (fire-and-forget)",
      },
      {
        order: 7,
        node: "quiz_feature",
        action:
          "Locks in shuffled questions, user answers with haptic feedback",
      },
      {
        order: 8,
        node: "quiz_feature",
        action:
          "Last question answered — calculates score, generates UUID session ID",
      },
      {
        order: 9,
        node: "supabase_client",
        action: "INSERT INTO quiz_results with 8s timeout",
      },
      {
        order: 10,
        node: "supabase_db",
        action: "Saves quiz result",
      },
      {
        order: 11,
        node: "best_score_service",
        action: "optimisticallyUpdateBestScore updates memCache + AsyncStorage",
      },
      {
        order: 12,
        node: "react_query",
        action: "Invalidates progress, stats, lectureBestScores queries",
      },
      {
        order: 13,
        node: "quiz_feature",
        action: "Shows QuizResultsView with score ring animation",
      },
    ],
  },
  {
    id: "offline-quiz-taking",
    name: "Offline Quiz Taking",
    description:
      "User takes a quiz while offline — stores result locally for later sync",
    steps: [
      {
        order: 1,
        node: "learn_feature",
        action: "User taps lecture (must be pre-downloaded for offline)",
      },
      {
        order: 2,
        node: "quiz_feature",
        action: "QuizScreen mounts, loads from question cache",
      },
      {
        order: 3,
        node: "question_cache",
        action: "Returns cached questions from AsyncStorage",
      },
      {
        order: 4,
        node: "quiz_feature",
        action: "User completes quiz offline",
      },
      {
        order: 5,
        node: "offline_queue",
        action:
          "enqueueQuizResult writes pending row to the SQLite quiz_results queue",
      },
      {
        order: 6,
        node: "offline_queue",
        action: "Persists queue to disk",
      },
      {
        order: 7,
        node: "progress_service",
        action:
          "optimisticallyMarkComplete adds lectureId to memCache + AsyncStorage",
      },
      {
        order: 8,
        node: "best_score_service",
        action: "optimisticallyUpdateBestScore updates score if higher",
      },
    ],
  },
  {
    id: "user-signup",
    name: "User Sign-Up",
    description:
      "Creates a new account with email and password via Supabase Auth, stores session securely, and navigates to the main app",
    steps: [
      {
        order: 1,
        node: "auth_feature",
        action: "User fills email and password fields, taps Sign Up",
      },
      {
        order: 2,
        node: "auth_store",
        action: "useAuthForm calls signUp(email, password)",
      },
      {
        order: 3,
        node: "supabase_client",
        action: "Calls supabase.auth.signUp({ email, password })",
      },
      {
        order: 4,
        node: "supabase_auth",
        action:
          "Creates user record, returns JWT session (or confirmation email if enabled)",
      },
      {
        order: 5,
        node: "secure_store",
        action: "SecureStoreAdapter chunks and persists session tokens",
      },
      {
        order: 6,
        node: "auth_store",
        action:
          "onAuthStateChange fires with SIGNED_IN event, sets session/user state",
      },
      {
        order: 7,
        node: "purchase_store",
        action:
          "PurchaseProvider detects new user.id, calls Purchases.logIn(userId) to sync RevenueCat identity",
      },
      {
        order: 8,
        node: "auth_feature",
        action: "router.replace('/(tabs)') navigates to main app",
      },
    ],
  },
  {
    id: "user-signout",
    name: "User Sign-Out",
    description:
      "Signs the user out, clears all local caches and in-memory state, logs out of RevenueCat, and redirects to login",
    steps: [
      {
        order: 1,
        node: "profile_feature",
        action: "User taps 'Sign Out' in AccountActions, haptic feedback fires",
      },
      {
        order: 2,
        node: "auth_store",
        action: "signOut() calls supabase.auth.signOut()",
      },
      {
        order: 3,
        node: "supabase_client",
        action: "Revokes session on server, clears local auth tokens",
      },
      {
        order: 4,
        node: "secure_store",
        action: "SecureStoreAdapter removes all chunked session tokens",
      },
      {
        order: 5,
        node: "cache_store",
        action:
          "clearAll() resets statsCache, warmedStats, and questionCacheBypassed",
      },
      {
        order: 6,
        node: "progress_service",
        action:
          "memCache.clear() and warmed.clear() — wipes in-memory progress",
      },
      {
        order: 7,
        node: "best_score_service",
        action:
          "memCache.clear() and warmed.clear() — wipes in-memory best scores",
      },
      {
        order: 8,
        node: "purchase_store",
        action: "PurchaseProvider detects user=null, calls Purchases.logOut()",
      },
      {
        order: 9,
        node: "profile_feature",
        action: "router.replace('/login') redirects to auth screen",
      },
    ],
  },
  {
    id: "offline-subject-download",
    name: "Offline Subject Download",
    description:
      "Downloads all questions for every lecture in a subject to AsyncStorage so the user can take quizzes offline",
    steps: [
      {
        order: 1,
        node: "learn_feature",
        action:
          "User taps download button on SubjectScreen, useSubjectCache.downloadSubject() fires",
      },
      {
        order: 2,
        node: "netinfo",
        action:
          "NetInfo.fetch() verifies device is online; blocks with Alert if offline",
      },
      {
        order: 3,
        node: "learn_feature",
        action:
          "Sets status='downloading', initializes progress counter { done: 0, total: lectures.length }",
      },
      {
        order: 4,
        node: "question_service",
        action:
          "fetchQuestions(lectureId) called for each lecture sequentially",
      },
      {
        order: 5,
        node: "supabase_client",
        action:
          "SELECT * FROM questions WHERE lecture_id = ? with FK auto-detection and 6s timeout",
      },
      {
        order: 6,
        node: "supabase_db",
        action: "Returns question rows for each lecture",
      },
      {
        order: 7,
        node: "question_cache",
        action:
          "saveQuestionsToCache stores shuffled questions to AsyncStorage (harvi:qcache:{lectureId}) with v3 version and questionCount",
      },
      {
        order: 8,
        node: "learn_feature",
        action:
          "Progress counter increments { done: i+1, total }, UI shows download progress bar",
      },
      {
        order: 9,
        node: "learn_feature",
        action:
          "All lectures downloaded — loadState() re-evaluates cache status, sets status='downloaded'",
      },
    ],
  },
  {
    id: "iap-purchase-module",
    name: "IAP Purchase Module",
    description:
      "User purchases a module via RevenueCat native IAP, records the transaction with the edge function, and unlocks content",
    steps: [
      {
        order: 1,
        node: "learn_feature",
        action:
          "User taps a locked lecture in SubjectScreen, navigates to /purchase/[moduleId]",
      },
      {
        order: 2,
        node: "purchase_feature",
        action:
          "PurchaseScreen mounts, BuyTab displays RevenueCat packages with prices",
      },
      {
        order: 3,
        node: "purchase_store",
        action:
          "purchaseModule(moduleId, rcPackage) called — initiates native payment",
      },
      {
        order: 4,
        node: "revenuecat",
        action:
          "Purchases.purchasePackage triggers native Apple/Google payment sheet",
      },
      {
        order: 5,
        node: "purchase_store",
        action:
          "Payment succeeds — extracts transactionIdentifier from receipt",
      },
      {
        order: 6,
        node: "supabase_functions",
        action:
          "supabase.functions.invoke('record-iap') with moduleId, transactionId, store (15s timeout)",
      },
      {
        order: 7,
        node: "supabase_db",
        action:
          "record-iap validates receipt, inserts into purchases table, grants content access",
      },
      {
        order: 8,
        node: "react_query",
        action:
          "invalidateAccess invalidates content_access, my_purchases, hierarchy, quiz queries",
      },
      {
        order: 9,
        node: "purchase_feature",
        action:
          "Shows SuccessState with confetti, user can navigate back to unlocked content",
      },
    ],
  },
  {
    id: "promo-code-redemption",
    name: "Promo Code Redemption",
    description:
      "User redeems an access code to unlock a module without payment, via Supabase RPC",
    steps: [
      {
        order: 1,
        node: "purchase_feature",
        action: "User switches to CodeTab in PurchaseScreen, enters promo code",
      },
      {
        order: 2,
        node: "purchase_store",
        action: "redeemCode(code) called with 15s timeout",
      },
      {
        order: 3,
        node: "supabase_client",
        action: "Calls supabase.rpc('redeem_access_code', { p_code: code })",
      },
      {
        order: 4,
        node: "supabase_db",
        action:
          "RPC validates code, marks it as used, creates purchase record, returns { success, item_name }",
      },
      {
        order: 5,
        node: "react_query",
        action:
          "invalidateAccess invalidates content_access, my_purchases, hierarchy, quiz queries",
      },
      {
        order: 6,
        node: "purchase_feature",
        action: "Shows SuccessState with redeemed item name",
      },
    ],
  },
  {
    id: "restore-purchase",
    name: "Restore Purchase",
    description:
      "User restores a previously purchased module from their Apple/Google account and re-records it with the backend",
    steps: [
      {
        order: 1,
        node: "purchase_feature",
        action: "User taps 'Restore Purchase' in PurchaseScreen",
      },
      {
        order: 2,
        node: "purchase_store",
        action: "restoreModule(moduleId, productId) called",
      },
      {
        order: 3,
        node: "revenuecat",
        action:
          "Purchases.restorePurchases() queries Apple/Google receipt store",
      },
      {
        order: 4,
        node: "purchase_store",
        action: "Checks allPurchasedProductIdentifiers for matching productId",
      },
      {
        order: 5,
        node: "supabase_functions",
        action:
          "supabase.functions.invoke('record-iap') re-records the restored transaction",
      },
      {
        order: 6,
        node: "supabase_db",
        action:
          "Validates and inserts purchase record (handles duplicate gracefully)",
      },
      {
        order: 7,
        node: "react_query",
        action: "invalidateAccess refreshes content_access and my_purchases",
      },
      {
        order: 8,
        node: "purchase_feature",
        action: "Shows SuccessState — module is re-unlocked",
      },
    ],
  },
  {
    id: "offline-sync-reconnection",
    name: "Offline Sync on Reconnection",
    description:
      "When the device comes back online, SyncProvider auto-flushes the offline queue to Supabase and updates all affected queries",
    steps: [
      {
        order: 1,
        node: "netinfo",
        action:
          "NetInfo.addEventListener fires with isConnected=true after network recovery",
      },
      {
        order: 2,
        node: "sync_store",
        action:
          "SyncProvider sets isOnline=true, calls onlineManager.setOnline(true)",
      },
      {
        order: 3,
        node: "sync_store",
        action: "useEffect detects isOnline && user — triggers flush()",
      },
      {
        order: 4,
        node: "offline_queue",
        action: "getQueue() returns all PendingQuizResult[] from AsyncStorage",
      },
      {
        order: 5,
        node: "sync_store",
        action:
          "Filters queue for current user, iterates items with 10s timeout per insert",
      },
      {
        order: 6,
        node: "supabase_client",
        action:
          "INSERT INTO quiz_results for each queued item (handles 23xxx duplicate codes)",
      },
      {
        order: 7,
        node: "supabase_db",
        action: "Persists quiz results — duplicates silently accepted",
      },
      {
        order: 8,
        node: "offline_queue",
        action:
          "removeSynced() clears successfully synced items from AsyncStorage",
      },
      {
        order: 9,
        node: "react_query",
        action:
          "Invalidates stats and progress queries so UI reflects fresh server data",
      },
      {
        order: 10,
        node: "sync_store",
        action: "Sets isSyncing=false, updates pendingCount to remaining items",
      },
    ],
  },
  {
    id: "stats-dashboard-loading",
    name: "Stats Dashboard Loading",
    description:
      "Loads the stats dashboard with multi-tier caching: synchronous cache → AsyncStorage → Supabase RPC, merging pending offline results",
    steps: [
      {
        order: 1,
        node: "stats_feature",
        action:
          "User navigates to Stats tab, useStats hook triggers fetchStats",
      },
      {
        order: 2,
        node: "cache_store",
        action:
          "useStats reads statsCache for synchronous initialData (no loading spinner on revisit)",
      },
      {
        order: 3,
        node: "stats_service",
        action:
          "fetchStats checks NetInfo — if offline, serves from AsyncStorage cache",
      },
      {
        order: 4,
        node: "netinfo",
        action: "Returns connectivity state",
      },
      {
        order: 5,
        node: "supabase_client",
        action:
          "Queries user_stats table + RPC get_user_stats_overview + lectures table for name map",
      },
      {
        order: 6,
        node: "supabase_db",
        action: "Returns aggregated stats data",
      },
      {
        order: 7,
        node: "offline_queue",
        action:
          "Reads pending queue to merge un-synced quiz results into displayed stats",
      },
      {
        order: 8,
        node: "stats_service",
        action:
          "Computes UserStats: streak, weekly_activity, subject_mastery, recent_results",
      },
      {
        order: 9,
        node: "cache_store",
        action:
          "writeCache sets stats in cacheStore.setStatsCache for instant access",
      },
      {
        order: 10,
        node: "stats_service",
        action:
          "writeCache persists UserStats snapshot to SQLite user_stats for offline fallback",
      },
      {
        order: 11,
        node: "stats_feature",
        action:
          "Renders StreakCard, StatsMetricsGrid, WeeklyChart, MasterySection, RecentResultsSection",
      },
    ],
  },
  {
    id: "profile-editing",
    name: "Profile Editing",
    description:
      "User edits their avatar and display name on the EditProfileScreen, persisted to AsyncStorage",
    steps: [
      {
        order: 1,
        node: "profile_feature",
        action:
          "User taps edit on ProfileScreen, navigates to EditProfileScreen",
      },
      {
        order: 2,
        node: "profile_feature",
        action:
          "useProfileEdit loads current avatar and displayName from per-user MMKV keys",
      },
      {
        order: 3,
        node: "profile_feature",
        action:
          "User taps avatar to open AvatarPicker — selects from DoctorAvatars grid",
      },
      {
        order: 4,
        node: "profile_feature",
        action:
          "handleSelectAvatar immediately saves selected avatar ID to the user's MMKV key",
      },
      {
        order: 5,
        node: "profile_feature",
        action: "User edits display name text field",
      },
      {
        order: 6,
        node: "profile_feature",
        action:
          "User taps Save — handleSave trims name, writes to MMKV",
      },
      {
        order: 7,
        node: "profile_feature",
        action: "Writes displayName and avatar to per-user MMKV keys",
      },
      {
        order: 8,
        node: "profile_feature",
        action:
          "Success haptic notification fires, router.back() returns to ProfileScreen",
      },
    ],
  },
  {
    id: "theme-switching",
    name: "Theme Switching",
    description:
      "User switches between 'harvi' (warm beige) and 'pink' themes via ProfileThemeSelector",
    steps: [
      {
        order: 1,
        node: "profile_feature",
        action: "User taps theme option in ProfileThemeSelector",
      },
      {
        order: 2,
        node: "theme_store",
        action: "setTheme updates Zustand state with new theme name",
      },
      {
        order: 3,
        node: "theme_store",
        action: "Persists theme choice to MMKV",
      },
      {
        order: 4,
        node: "theme_store",
        action:
          "ThemeProvider re-renders — all useColors consumers get new palette",
      },
      {
        order: 5,
        node: "app",
        action:
          "Entire app re-renders with new color palette (Appearance.setColorScheme('light') for both)",
      },
    ],
  },
  {
    id: "feedback-submission",
    name: "Feedback Submission",
    description:
      "User submits feedback from ProfileScreen, with connectivity check, input sanitization, character limit, and cooldown timer",
    steps: [
      {
        order: 1,
        node: "profile_feature",
        action:
          "User scrolls to FeedbackForm on ProfileScreen, types feedback (max 500 chars)",
      },
      {
        order: 2,
        node: "feedback_form",
        action:
          "useFeedback validates input: trims whitespace, sanitizes content, enforces character limit",
      },
      {
        order: 3,
        node: "netinfo",
        action:
          "NetInfo.fetch() checks connectivity — blocks submission if offline",
      },
      {
        order: 4,
        node: "supabase_client",
        action: "INSERT INTO feedback with user_id and sanitized message",
      },
      {
        order: 5,
        node: "supabase_db",
        action: "Saves feedback record",
      },
      {
        order: 6,
        node: "feedback_form",
        action:
          "Success haptic fires, clears input, starts cooldown timer to prevent spam",
      },
    ],
  },
  {
    id: "clear-quiz-history",
    name: "Clear Quiz History",
    description:
      "Destructive action that deletes all quiz results from server and all local caches, resetting the user's progress to zero",
    steps: [
      {
        order: 1,
        node: "profile_feature",
        action:
          "User taps 'Clear Quiz History' in AccountActions, confirmation Alert shown",
      },
      {
        order: 2,
        node: "sync_store",
        action:
          "Checks isOnline — blocks with Alert if offline (requires network)",
      },
      {
        order: 3,
        node: "supabase_client",
        action:
          "DELETE FROM quiz_results WHERE user_id = ? AND DELETE FROM user_stats WHERE user_id = ? (10s timeout)",
      },
      {
        order: 4,
        node: "supabase_db",
        action: "Removes all quiz results and computed stats for this user",
      },
      {
        order: 5,
        node: "stats_service",
        action:
          "clearStatsCache wipes AsyncStorage and cacheStore for this user",
      },
      {
        order: 6,
        node: "progress_service",
        action:
          "clearProgressCache wipes memCache, warmed set, and AsyncStorage progress",
      },
      {
        order: 7,
        node: "best_score_service",
        action:
          "clearBestScoreCache wipes memCache, warmed set, and AsyncStorage scores",
      },
      {
        order: 8,
        node: "offline_queue",
        action:
          "clearQueueForUser removes any pending offline results for this user",
      },
      {
        order: 9,
        node: "react_query",
        action:
          "setQueriesData zeroes stats/progress/bestScores immediately, then invalidateQueries refetches clean state",
      },
      {
        order: 10,
        node: "profile_feature",
        action:
          "Warning haptic fires, shows 'History Cleared' confirmation Alert",
      },
    ],
  },
  {
    id: "clear-downloaded-lectures",
    name: "Clear Downloaded Lectures",
    description:
      "Removes all offline-cached questions from AsyncStorage, freeing device storage",
    steps: [
      {
        order: 1,
        node: "profile_feature",
        action:
          "User taps 'Clear Downloaded Lectures' in AccountActions, confirmation Alert shown",
      },
      {
        order: 2,
        node: "question_cache",
        action:
          "clearAllLectureCache clears the SQLite questions table for every lecture",
      },
      {
        order: 3,
        node: "cache_store",
        action: "Sets questionCacheBypassed=true to prevent stale cache reads",
      },
      {
        order: 4,
        node: "question_cache",
        action: "Removes all cached question rows from the SQLite questions table",
      },
      {
        order: 5,
        node: "react_query",
        action:
          "setQueriesData clears quiz query data, removeQueries purges quiz cache",
      },
      {
        order: 6,
        node: "profile_feature",
        action:
          "Warning haptic fires, shows 'Downloads Cleared' confirmation Alert",
      },
    ],
  },
  {
    id: "mastery-screen-navigation",
    name: "Mastery Screen Deep Dive",
    description:
      "User navigates from Stats dashboard to the detailed MasteryScreen to view per-subject mastery breakdown with filter chips",
    steps: [
      {
        order: 1,
        node: "stats_feature",
        action: "User taps 'See All' on MasterySection in StatsScreen",
      },
      {
        order: 2,
        node: "stats_feature",
        action: "Navigates to MasteryScreen with user.id parameter",
      },
      {
        order: 3,
        node: "stats_service",
        action:
          "useStats provides subject_mastery data with per-subject quiz counts and average scores",
      },
      {
        order: 4,
        node: "hierarchy_service",
        action:
          "Resolves lecture/subject names for display via cached hierarchy data",
      },
      {
        order: 5,
        node: "stats_feature",
        action:
          "useMasteryFilter applies filter chips (All, Mastered, In Progress, Not Started)",
      },
      {
        order: 6,
        node: "stats_feature",
        action:
          "Renders filtered subject mastery cards with progress bars and mastery badges",
      },
    ],
  },
  {
    id: "quiz-result-review",
    name: "Quiz Result Review",
    description:
      "After completing a quiz, user reviews all questions with correct/incorrect answers and explanations",
    steps: [
      {
        order: 1,
        node: "quiz_feature",
        action:
          "Quiz completes — QuizResultsView shows animated ScoreRing with final percentage",
      },
      {
        order: 2,
        node: "quiz_feature",
        action: "User taps 'Review Answers' button",
      },
      {
        order: 3,
        node: "react_query",
        action:
          "ReviewScreen retrieves the cached quiz session data (questions + user's selected answers)",
      },
      {
        order: 4,
        node: "quiz_feature",
        action:
          "ReviewScreen renders all questions with user's answers highlighted (green=correct, red=incorrect)",
      },
      {
        order: 5,
        node: "quiz_feature",
        action:
          "Each question card shows: question text, image, all options, correct answer indicator, and user's selection",
      },
      {
        order: 6,
        node: "quiz_feature",
        action: "User scrolls through review, taps 'Done' to exit",
      },
      {
        order: 7,
        node: "app",
        action:
          "Router navigates back to SubjectScreen, clearing the active quiz session",
      },
    ],
  },
];
