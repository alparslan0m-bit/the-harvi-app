module.exports = [
  {
    "id": "app",
    "label": "Mobile App Router",
    "type": "ui",
    "layer": "presentation",
    "path": "artifacts/mobile/app/_layout.tsx",
    "technology": "Expo Router",
    "description": "Root layout: mounts provider tree (ErrorBoundary → QueryClient → GestureHandler → Keyboard → Theme → Auth → Purchase → Sync) and Stack navigator"
  },
  {
    "id": "tab_navigator",
    "label": "Tab Navigator",
    "type": "ui",
    "layer": "presentation",
    "path": "artifacts/mobile/app/(main)/(tabs)/_layout.tsx",
    "technology": "Expo Router Tabs",
    "description": "Custom floating pill-shaped tab bar with 3 tabs: Learn, Stats, Profile. Uses CustomTabBar component"
  },
  {
    "id": "auth_feature",
    "label": "Auth UI",
    "type": "feature",
    "layer": "presentation",
    "path": "artifacts/mobile/src/features/auth/",
    "technology": "React Native",
    "description": "Login screen (email/password + Google OAuth) and auth callback handler. Uses useAuthForm hook"
  },
  {
    "id": "learn_feature",
    "label": "Learn UI",
    "type": "feature",
    "layer": "presentation",
    "path": "artifacts/mobile/src/features/learn/",
    "technology": "React Native",
    "description": "Content browsing: LearnScreen → YearScreen → ModuleScreen → SubjectScreen. Includes offline download (useSubjectCache), progress badges, best score stars, and mastery filter"
  },
  {
    "id": "quiz_feature",
    "label": "Quiz UI",
    "type": "feature",
    "layer": "presentation",
    "path": "artifacts/mobile/src/features/quiz/",
    "technology": "React Native + Reanimated",
    "description": "Active quiz session: question display with images, animated progress bar, option selection with haptics, results view with ScoreRing, and full review screen"
  },
  {
    "id": "stats_feature",
    "label": "Stats UI",
    "type": "feature",
    "layer": "presentation",
    "path": "artifacts/mobile/src/features/stats/",
    "technology": "React Native",
    "description": "Dashboard: StreakCard, StatsMetricsGrid (4 stat pill cards), WeeklyChart, MasterySection with filter chips, RecentResultsSection. Navigates to MasteryScreen for detailed view"
  },
  {
    "id": "purchase_feature",
    "label": "Purchase UI",
    "type": "feature",
    "layer": "presentation",
    "path": "artifacts/mobile/src/features/purchase/",
    "technology": "React Native",
    "description": "Paywall modal: TabSwitcher (Buy/Code tabs), BuyTab with RevenueCat packages, CodeTab for promo codes, restore purchase, SuccessState. Presented as modal from learn flow"
  },
  {
    "id": "profile_feature",
    "label": "Profile UI",
    "type": "feature",
    "layer": "presentation",
    "path": "artifacts/mobile/src/features/profile/",
    "technology": "React Native",
    "description": "ProfileScreen (avatar, name, theme selector, feedback form, account actions), EditProfileScreen (avatar picker with DoctorAvatars, display name editing)"
  },
  {
    "id": "error_boundary",
    "label": "Error Boundary",
    "type": "ui",
    "layer": "presentation",
    "path": "artifacts/mobile/src/shared/components/ErrorBoundary.tsx",
    "technology": "React",
    "description": "Catches unhandled component errors app-wide, renders ErrorFallback"
  },
  {
    "id": "offline_banner",
    "label": "Offline Banner",
    "type": "ui",
    "layer": "presentation",
    "path": "artifacts/mobile/src/shared/components/OfflineBanner.tsx",
    "technology": "React Native Reanimated",
    "description": "Animated banner that shows offline/syncing status. Exported from shared components but not currently rendered in any screen"
  },
  {
    "id": "feedback_form",
    "label": "Feedback Form",
    "type": "ui",
    "layer": "presentation",
    "path": "artifacts/mobile/src/shared/components/FeedbackForm.tsx",
    "technology": "React Native",
    "description": "Self-contained feedback submission component with cooldown timer, character limit (500), input sanitization, and haptic feedback. Rendered inside ProfileScreen"
  },
  {
    "id": "auth_store",
    "label": "Auth Store",
    "type": "state",
    "layer": "application",
    "path": "artifacts/mobile/src/shared/store/authStore.tsx",
    "technology": "Zustand",
    "description": "Manages user session: signIn (email), signUp, signInWithGoogle (via expo-web-browser OAuth), signOut. AuthProvider listens to onAuthStateChange and deep links. Clears cacheStore, progressService memCache, and bestScoreService memCache on sign-out"
  },
  {
    "id": "sync_store",
    "label": "Sync Engine",
    "type": "state",
    "layer": "application",
    "path": "artifacts/mobile/src/shared/store/syncStore.tsx",
    "technology": "Zustand + React Query",
    "description": "Tracks isOnline, isSyncing, pendingCount. SyncProvider subscribes to NetInfo for connectivity. useSyncActions provides flush() which drains offline queue to Supabase with 10s timeouts and 30s backoff, then invalidates stats/progress queries"
  },
  {
    "id": "purchase_store",
    "label": "Purchase Store",
    "type": "state",
    "layer": "application",
    "path": "artifacts/mobile/src/shared/store/purchaseStore.tsx",
    "technology": "Zustand + RevenueCat",
    "description": "Manages IAP: purchaseModule (RevenueCat SDK → record-iap edge function), redeemCode (Supabase RPC redeem_access_code), restorePurchases, restoreModule. PurchaseProvider initializes RevenueCat and syncs user identity"
  },
  {
    "id": "cache_store",
    "label": "Cache Store",
    "type": "state",
    "layer": "application",
    "path": "artifacts/mobile/src/shared/store/cacheStore.ts",
    "technology": "Zustand",
    "description": "In-memory Zustand store for: statsCache (Map<userId, UserStats>), warmedStats (Set<userId>), questionCacheBypassed flag. No API calls — purely a synchronous cache layer"
  },
  {
    "id": "theme_store",
    "label": "Theme Store",
    "type": "state",
    "layer": "application",
    "path": "artifacts/mobile/src/shared/store/themeStore.tsx",
    "technology": "Zustand",
    "description": "Manages theme preference: 'harvi' (warm beige) or 'pink'. ThemeProvider loads saved theme from AsyncStorage on mount. Sets Appearance.setColorScheme('light') for both themes"
  },
  {
    "id": "react_query",
    "label": "React Query Client",
    "type": "state",
    "layer": "application",
    "path": "artifacts/mobile/app/_layout.tsx",
    "technology": "TanStack React Query",
    "description": "Global QueryClient with offlineFirst networkMode, 24h gcTime, retry: 1. Provides data caching layer for all features: hierarchy, progress, bestScores, stats, quiz, content_access, my_purchases. Supports query invalidation for cross-feature reactivity"
  },
  {
    "id": "hierarchy_service",
    "label": "Hierarchy Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/learn/services/hierarchyService.ts",
    "technology": "TypeScript",
    "description": "Fetches Year→Module→Subject→Lecture tree from 4 Supabase tables (years, modules, subjects, lectures) with FK auto-detection. Offline-first: caches full hierarchy to AsyncStorage, serves cache when offline"
  },
  {
    "id": "access_service",
    "label": "Access Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/learn/services/accessService.ts",
    "technology": "TypeScript",
    "description": "Fetches content access map via Supabase RPC get_content_access_map. Returns Map<itemId, ContentAccessEntry> with has_access, is_free, price_cents. Caches to AsyncStorage for offline"
  },
  {
    "id": "progress_service",
    "label": "Progress Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/learn/services/progressService.ts",
    "technology": "TypeScript",
    "description": "Tracks completed lectures (Set<lectureId>) via quiz_results table with FK auto-detection. Three-tier cache: module-level memCache → AsyncStorage → Supabase. Merges queued offline IDs. Provides optimisticallyMarkComplete for instant UI updates"
  },
  {
    "id": "best_score_service",
    "label": "Best Score Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/learn/services/bestScoreService.ts",
    "technology": "TypeScript",
    "description": "Tracks best quiz score per lecture (Map<lectureId, score%>) from quiz_results. Three-tier cache: memCache → AsyncStorage → Supabase. Merges queued offline scores. Provides optimisticallyUpdateBestScore for instant star updates"
  },
  {
    "id": "question_service",
    "label": "Question Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/quiz/services/questionService.ts",
    "technology": "TypeScript",
    "description": "Fetches quiz questions from Supabase 'questions' table with FK column auto-detection (tries lecture_id, subject_id, topic_id, etc.). Caches discovered FK column to AsyncStorage. Shuffles questions and options while tracking correct answer index"
  },
  {
    "id": "stats_service",
    "label": "Stats Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/stats/services/statsService.ts",
    "technology": "TypeScript",
    "description": "Aggregates quiz data into UserStats: total_quizzes, average_score, best_score, streak (with day-gap calculation), weekly_activity (Sat-Fri), subject_mastery, recent_results. Uses Supabase RPC get_user_stats_overview + user_stats table. Merges pending offline queue results. Caches to AsyncStorage + cacheStore"
  },
  {
    "id": "question_cache",
    "label": "Question Cache",
    "type": "storage",
    "layer": "infrastructure",
    "path": "artifacts/mobile/src/features/quiz/services/questionCache.ts",
    "technology": "TypeScript + AsyncStorage",
    "description": "AsyncStorage-based per-lecture question cache (harvi:qcache:{lectureId}). Versioned (v3) to invalidate stale data. Used for offline quiz-taking after subject download. Tracks questionCount and downloadedAt for staleness detection"
  },
  {
    "id": "offline_queue",
    "label": "Offline Queue",
    "type": "storage",
    "layer": "infrastructure",
    "path": "artifacts/mobile/src/shared/services/offlineQueue.ts",
    "technology": "TypeScript + AsyncStorage",
    "description": "Manages pending offline quiz result mutations (harvi:quiz_queue). Validated with Zod PendingQuizResultSchema. Generates UUIDs for deduplication. Provides enqueue, getQueue, removeSynced, clearQueueForUser, pendingCount"
  },
  {
    "id": "supabase_client",
    "label": "Supabase Client",
    "type": "api",
    "layer": "infrastructure",
    "path": "artifacts/mobile/src/shared/services/supabase.ts",
    "technology": "Supabase JS",
    "description": "createClient with custom SecureStoreAdapter that chunks auth tokens (1800-byte chunks) to work within iOS SecureStore 2KB limit. Falls back to localStorage on web. autoRefreshToken, persistSession enabled"
  },
  {
    "id": "secure_store",
    "label": "Secure Store",
    "type": "storage",
    "layer": "infrastructure",
    "path": "expo-secure-store",
    "technology": "Expo",
    "description": "Securely stores chunked auth session tokens. Custom adapter splits values >1800 bytes into __chunk_0, __chunk_1, etc. with a __count key"
  },
  {
    "id": "async_storage",
    "label": "Async Storage",
    "type": "storage",
    "layer": "infrastructure",
    "path": "@react-native-async-storage/async-storage",
    "technology": "React Native",
    "description": "Persistent key-value storage used by: hierarchy cache, progress cache, best score cache, stats cache, access cache, purchases cache, offline queue, question cache, theme, profile (avatar/name), quiz FK column"
  },
  {
    "id": "supabase_auth",
    "label": "Supabase Auth",
    "type": "external",
    "layer": "external",
    "description": "Remote authentication provider supporting email/password and OAuth (Google). Provides JWT sessions with auto-refresh"
  },
  {
    "id": "supabase_db",
    "label": "Supabase Database",
    "type": "database",
    "layer": "external",
    "technology": "PostgreSQL",
    "description": "Tables: years, modules, subjects, lectures, questions, quiz_results, user_stats, purchases, feedback. RPCs: get_user_stats_overview, get_content_access_map, redeem_access_code"
  },
  {
    "id": "supabase_functions",
    "label": "Edge Functions",
    "type": "service",
    "layer": "external",
    "path": "supabase/functions/",
    "technology": "Deno",
    "description": "Serverless backend: record-iap function verifies IAP transactions and grants access"
  },
  {
    "id": "revenuecat",
    "label": "RevenueCat",
    "type": "external",
    "layer": "external",
    "description": "In-App Purchase SDK (react-native-purchases). Handles native Apple/Google payment flows, customer identity (logIn/logOut), purchase restoration, and receipt validation"
  },
  {
    "id": "netinfo",
    "label": "NetInfo",
    "type": "external",
    "layer": "external",
    "path": "@react-native-community/netinfo",
    "technology": "React Native",
    "description": "Network connectivity detection. Used by syncStore (subscribe to changes), and by every service layer (fetch/addEventListener) for offline-first short-circuit before any Supabase call"
  },
  {
    "id": "google_oauth",
    "label": "Google OAuth",
    "type": "external",
    "layer": "external",
    "description": "Google OAuth provider accessed via expo-web-browser openAuthSessionAsync. Supabase initiates the OAuth flow, browser handles consent, app receives code/tokens via deep link redirect"
  },
  {
    "id": "shared_utils",
    "label": "Shared Utils",
    "type": "unknown",
    "layer": "unknown",
    "description": "Auto-discovered node: shared_utils"
  }
];
