module.exports = [
  {
    "id": "app",
    "label": "Mobile App Router",
    "type": "ui",
    "layer": "presentation",
    "path": "artifacts/mobile/app/_layout.tsx",
    "technology": "Expo Router",
    "description": "Root layout: mounts provider tree (SafeArea → ErrorBoundary → QueryClient → GestureHandler → Keyboard → Database → Theme → Auth → Purchase → Sync), ReducedMotionConfig, Stack navigator (tabs, auth/login, auth callback, quiz, purchase modal, profile edit, +not-found), and the global offline/sync banner (GlobalOfflineBanner)"
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
    "description": "Content browsing: LearnScreen → YearScreen → ModuleScreen → SubjectScreen. Includes offline download (useSubjectCache with none/partial/downloaded/stale/downloading states + staleness detection via lecture question_count), progress badges, best-score stars, lock states that route to the purchase modal"
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
    "description": "Dashboard: StatsMetricsGrid (4 stat pill cards), StreakCard, WeeklyActivitySection/WeeklyChart, MasterySection (top-3 subjects + 'View All' deep link), RecentResultsSection, EmptyNudge. Detailed MasteryScreen adds search + filter chips (All, Strong, Improving, Needs Work)"
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
    "description": "Animated top banner showing offline/syncing/queued-result status (OfflineBanner + self-contained GlobalOfflineBanner wrapper). Rendered globally in the root layout and driven by useSyncStore (isOnline, pendingCount, isSyncing)"
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
    "description": "Manages user session: signIn (email), signUp, signInWithGoogle (via expo-web-browser OAuth + code/access_token exchange), signOut. AuthProvider hydrates the session (getSession), listens to onAuthStateChange and deep links. Sign-out clears every user-scoped SQLite row + offline queue (clearAllUserCaches), the MMKV profile, and purges all React Query queries via queryClient.clear()"
  },
  {
    "id": "sync_store",
    "label": "Sync Engine",
    "type": "state",
    "layer": "application",
    "path": "artifacts/mobile/src/shared/store/syncStore.tsx",
    "technology": "Zustand + React Query",
    "description": "Tracks isOnline, isSyncing, pendingCount. SyncProvider subscribes to NetInfo and bridges React Query onlineManager. useSyncActions flush() drains the pending SQLite queue (10s per-item timeout, 30s backoff, dead-letters rows past MAX_SYNC_ATTEMPTS, handles legacy dot-ids and 23505 duplicates) then invalidates stats/progress queries"
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
    "description": "Minimal in-memory Zustand store: questionCacheBypassed flag + clearAll. No API calls — synchronous flag only. Stats/progress/bestScore caching now lives in SQLite (user_stats/progress/best_scores) and is read synchronously via readCacheSync as React Query initialData"
  },
  {
    "id": "theme_store",
    "label": "Theme Store",
    "type": "state",
    "layer": "application",
    "path": "artifacts/mobile/src/shared/store/themeStore.tsx",
    "technology": "Zustand + MMKV",
    "description": "Manages theme preference: 'harvi' (warm beige) or 'pink'. ThemeProvider reads the saved theme from MMKV synchronously (useMMKVString) and sets Appearance.setColorScheme('light') for both themes"
  },
  {
    "id": "react_query",
    "label": "React Query Client",
    "type": "state",
    "layer": "application",
    "path": "artifacts/mobile/app/_layout.tsx",
    "technology": "TanStack React Query",
    "description": "Global QueryClient with offlineFirst networkMode, 24h gcTime, retry: 1. Provides the data-caching layer for all features — query keys: hierarchy, progress_sync, lectureBestScores_sync, stats, quiz, content_access, my_purchases. Supports query invalidation for cross-feature reactivity"
  },
  {
    "id": "zustand",
    "label": "Zustand",
    "type": "state",
    "layer": "application",
    "path": "zustand",
    "technology": "Zustand",
    "description": "Lightweight global state library powering authStore, purchaseStore, cacheStore, syncStore, and themeStore for client-side app state"
  },
  {
    "id": "hierarchy_service",
    "label": "Hierarchy Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/learn/services/hierarchyService.ts",
    "technology": "TypeScript + SQLite",
    "description": "Fetches Year→Module→Subject→Lecture tree from 4 Supabase tables (years, modules, subjects, lectures) with FK auto-detection. Offline-first: persists the hierarchy to SQLite (hierarchy_years/modules/subjects/lectures via HierarchyRepository), serves cache when offline"
  },
  {
    "id": "access_service",
    "label": "Access Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/learn/services/accessService.ts",
    "technology": "TypeScript + SQLite",
    "description": "Fetches content access map via Supabase RPC get_content_access_map. Returns Map<itemId, ContentAccessEntry> with has_access, is_free, price_cents. Caches to SQLite access_map table (replace-in-transaction) for offline"
  },
  {
    "id": "progress_service",
    "label": "Progress Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/learn/services/progressService.ts",
    "technology": "TypeScript + SQLite",
    "description": "Tracks completed lectures (Set<lectureId>) from the Supabase quiz_results table, cached to the SQLite progress table and served through a Drizzle useLiveQuery + a React Query sync hook (progress_sync). Merges queued offline IDs. Provides optimisticallyMarkComplete for instant UI updates"
  },
  {
    "id": "best_score_service",
    "label": "Best Score Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/learn/services/bestScoreService.ts",
    "technology": "TypeScript + SQLite",
    "description": "Tracks best quiz score per lecture (Map<lectureId, score%>) from the Supabase quiz_results table, cached to the SQLite best_scores table and served through a Drizzle useLiveQuery + a React Query sync hook (lectureBestScores_sync). Merges queued offline scores. Provides optimisticallyUpdateBestScore (atomic upsert) for instant star updates"
  },
  {
    "id": "question_service",
    "label": "Question Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/quiz/services/questionService.ts",
    "technology": "TypeScript + MMKV",
    "description": "Fetches quiz questions from Supabase 'questions' table with FK column auto-detection (tries lecture_id, subject_id, topic_id, etc.). Caches discovered FK column to MMKV. Shuffles questions and options while tracking correct answer index"
  },
  {
    "id": "stats_service",
    "label": "Stats Service",
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/features/stats/services/statsService.ts",
    "technology": "TypeScript + SQLite",
    "description": "Aggregates quiz data into UserStats: total_quizzes, total_questions, average_score, best_score, streak (with day-gap calculation), weekly_activity (Sat-Fri), subject_mastery, recent_results. Uses Supabase RPC get_user_stats_overview + user_stats table; merges pending offline queue results at read time (never double-counted against the persisted snapshot). Caches the server-only snapshot to SQLite user_stats, served synchronously via readCacheSync as React Query initialData"
  },
  {
    "id": "question_cache",
    "label": "Question Cache",
    "type": "storage",
    "layer": "infrastructure",
    "path": "artifacts/mobile/src/features/quiz/services/questionCache.ts",
    "technology": "TypeScript + SQLite",
    "description": "SQLite per-lecture question cache (questions table via QuestionRepository), version-gated by app_meta question_cache_version. Serves cached questions only to users with a local entitlement (hasLocalAccessToLecture). Used for offline quiz-taking after subject download. Tracks questionCount and downloadedAt for staleness detection"
  },
  {
    "id": "offline_queue",
    "label": "Offline Queue",
    "type": "storage",
    "layer": "infrastructure",
    "path": "artifacts/mobile/src/shared/services/offlineQueue.ts",
    "technology": "TypeScript + SQLite",
    "description": "Manages pending offline quiz result mutations in the SQLite quiz_results table (status='pending' rows via QueueRepository — atomic INSERT/UPDATE, no read-modify-write lock). Validated with Zod PendingQuizResultSchema. Generates UUIDs for deduplication. Provides enqueue, getQueueForUser, getFlushableForUser (respects MAX_SYNC_ATTEMPTS dead-letter cap), recordFailure, removeSynced, clearQueueForUser, pendingCount"
  },
  {
    "id": "supabase_client",
    "label": "Supabase Client",
    "type": "api",
    "layer": "infrastructure",
    "path": "artifacts/mobile/src/shared/services/supabase.ts",
    "technology": "Supabase JS",
    "description": "createClient with custom SecureStoreAdapter that chunks auth tokens (1800-byte chunks) to work within iOS SecureStore 2KB limit. Falls back to localStorage on web. autoRefreshToken + persistSession enabled, detectSessionInUrl disabled"
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
    "id": "sqlite",
    "label": "SQLite Database",
    "type": "database",
    "layer": "infrastructure",
    "path": "expo-sqlite",
    "technology": "expo-sqlite + Drizzle ORM",
    "description": "On-device relational database (harvi.db) via expo-sqlite with Drizzle ORM. PRAGMA-tuned (WAL, synchronous=NORMAL, foreign_keys=ON, cache_size=-8000, busy_timeout=5000). Migrated with Drizzle useMigrations; cold-start maintenance (runColdStartMaintenance) purges synced quiz_results older than 30 days, debounces PRAGMA optimize hourly, and throttles VACUUM to monthly. Tables: hierarchy_years, hierarchy_modules, hierarchy_subjects, hierarchy_lectures, questions, progress, best_scores, bookmarks, quiz_results, user_stats, access_map, purchases, app_meta"
  },
  {
    "id": "mmkv",
    "label": "MMKV Storage",
    "type": "storage",
    "layer": "infrastructure",
    "path": "artifacts/mobile/src/shared/storage/mmkv.ts",
    "technology": "react-native-mmkv",
    "description": "Synchronous on-device key-value store (harvi-default). Holds non-sensitive preferences: theme, per-user profile (avatar/displayName), and the quiz FK-column resolution. Typed accessor in src/shared/storage/mmkv.ts"
  },
  {
    "id": "database",
    "label": "SQLite Data Access Layer",
    "type": "storage",
    "layer": "infrastructure",
    "path": "artifacts/mobile/src/db",
    "technology": "Drizzle ORM + expo-sqlite",
    "description": "Opens and migrates the on-device SQLite database (getDb, DatabaseProvider). Provides schema, repositories (Hierarchy/Question/Queue/Meta), raw SQL access, atomic cache transactions (cacheTransactions), and cold-start maintenance (retention purge of synced quiz_results, debounced PRAGMA optimize, monthly VACUUM)"
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
    "description": "PostgreSQL backend. Tables: years, modules, subjects, lectures, questions, profiles, user_stats, quiz_results, feedback, lecture_statistics, purchases, access_codes. RPCs/functions: get_user_streak, decay_stale_streaks, get_admin_dashboard_stats, set_default_external_id, get_user_aggregate_stats, get_active_users_today, get_analytics_summary, get_recent_activity, handle_new_user, sync_lecture_stats, sync_user_stats, sync_user_stats_on_delete, sync_lecture_stats_on_delete, update_updated_at_column, is_admin, check_content_access, get_content_access_map, redeem_access_code, admin_generate_codes, get_user_stats_overview"
  },
  {
    "id": "supabase_functions",
    "label": "Edge Functions",
    "type": "service",
    "layer": "external",
    "path": "supabase/functions/",
    "technology": "Deno",
    "description": "Serverless Deno backend. Functions: record-iap. record-iap authenticates the caller, validates module/transaction/store input, enforces idempotency + receipt-replay protection, optionally verifies the transaction server-side with RevenueCat, blocks double-buys, and records entitlements in the purchases table"
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
    "type": "service",
    "layer": "application",
    "path": "artifacts/mobile/src/shared/utils/cacheUtils.ts",
    "technology": "TypeScript",
    "description": "netInfo (isDeviceOnline connectivity helper) and cacheUtils (clearAllUserCaches — deletes user-scoped SQLite rows + offline queue on sign-out)"
  }
];
