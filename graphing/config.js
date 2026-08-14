// ============================================================================
//  ARCHITECTURE GOVERNANCE — CONFIG
// ============================================================================
//
//  Curated truth for the Harvi architecture graph. Moved verbatim from
//  the monolithic verify_graph.js; everything here is shared state that
//  later tasks may drive from config rather than hardcoded logic.

// Curated node IDs + file patterns (validated against disk)
const nodeMapping = {
  app: ["artifacts/mobile/app/_layout.tsx"],
  tab_navigator: [
    "artifacts/mobile/app/(main)/(tabs)/_layout.tsx",
  ],
  auth_feature: [
    "artifacts/mobile/src/features/auth",
    "artifacts/mobile/app/(auth)",
  ],
  learn_feature: [
    "artifacts/mobile/src/features/learn",
    "artifacts/mobile/app/(main)/(tabs)/(learn)",
  ],
  quiz_feature: [
    "artifacts/mobile/src/features/quiz",
    "artifacts/mobile/app/(main)/quiz",
  ],
  stats_feature: [
    "artifacts/mobile/src/features/stats",
    "artifacts/mobile/app/(main)/(tabs)/stats.tsx",
    "artifacts/mobile/app/(main)/stats",
  ],
  purchase_feature: [
    "artifacts/mobile/src/features/purchase",
    "artifacts/mobile/app/(main)/purchase",
  ],
  profile_feature: [
    "artifacts/mobile/src/features/profile",
    "artifacts/mobile/app/(main)/(tabs)/profile.tsx",
    "artifacts/mobile/app/(main)/profile",
  ],
  auth_store: ["artifacts/mobile/src/shared/store/authStore.tsx"],
  sync_store: ["artifacts/mobile/src/shared/store/syncStore.tsx"],
  purchase_store: ["artifacts/mobile/src/shared/store/purchaseStore.tsx"],
  cache_store: ["artifacts/mobile/src/shared/store/cacheStore.ts"],
  theme_store: ["artifacts/mobile/src/shared/store/themeStore.tsx"],
  hierarchy_service: [
    "artifacts/mobile/src/features/learn/services/hierarchyService.ts",
  ],
  access_service: [
    "artifacts/mobile/src/features/learn/services/accessService.ts",
  ],
  progress_service: [
    "artifacts/mobile/src/features/learn/services/progressService.ts",
  ],
  best_score_service: [
    "artifacts/mobile/src/features/learn/services/bestScoreService.ts",
  ],
  question_service: [
    "artifacts/mobile/src/features/quiz/services/questionService.ts",
  ],
  stats_service: [
    "artifacts/mobile/src/features/stats/services/statsService.ts",
  ],
  question_cache: [
    "artifacts/mobile/src/features/quiz/services/questionCache.ts",
  ],
  offline_queue: ["artifacts/mobile/src/shared/services/offlineQueue.ts"],
  supabase_client: ["artifacts/mobile/src/shared/services/supabase.ts"],
  offline_banner: [
    "artifacts/mobile/src/shared/components/OfflineBanner.tsx",
  ],
  feedback_form: [
    "artifacts/mobile/src/shared/components/FeedbackForm.tsx",
  ],
  error_boundary: [
    "artifacts/mobile/src/shared/components/ErrorBoundary.tsx",
  ],
  shared_utils: [
    "artifacts/mobile/src/shared/utils/netInfo.ts",
    "artifacts/mobile/src/shared/utils/cacheUtils.ts",
  ],
};

// External packages → node IDs (discovered from import statements)
const externalPackageMap = {
  "expo-secure-store": "secure_store",
  "@react-native-async-storage/async-storage": "async_storage",
  "react-native-purchases": "revenuecat",
  "@react-native-community/netinfo": "netinfo",
  "expo-web-browser": "google_oauth",
  "@tanstack/react-query": "react_query",
};

// Remote nodes — no local files, added if code references them
const remoteNodes = {
  supabase_auth: {
    patterns: [/supabase\.auth\./],
    description: "Supabase Auth API calls",
  },
  supabase_db: {
    patterns: [/supabase\.from\(/, /supabase\.rpc\(/],
    description: "Supabase Database queries/RPCs",
  },
  supabase_functions: {
    patterns: [/supabase\.functions\.invoke\(/],
    description: "Supabase Edge Function invocations",
  },
};

// Remotes a node implicitly connects to (config-driven; later tasks)
const supabaseClientImplicitRemotes = {
  supabase_client: ["supabase_auth", "supabase_db"],
};

// Layer order for generated docs/charts
const orderedLayers = ["presentation", "application", "infrastructure", "external"];

// Mermaid classDef styles, one per ordered layer + a neutral gray/dashed
// `unknown` fallback for nodes not in any known layer.
const layerClasses = {
  presentation: "fill:#f472b6,stroke:#831843,stroke-width:2px,color:#000",
  application: "fill:#60a5fa,stroke:#1e3a8a,stroke-width:2px,color:#000",
  infrastructure: "fill:#fbbf24,stroke:#78350f,stroke-width:2px,color:#000",
  external: "fill:#a1a1aa,stroke:#3f3f46,stroke-width:2px,color:#000",
  unknown:
    "fill:#52525b,stroke:#3f3f46,stroke-width:2px,stroke-dasharray:5 5,color:#e4e4e7",
};

module.exports = {
  nodeMapping,
  externalPackageMap,
  remoteNodes,
  supabaseClientImplicitRemotes,
  orderedLayers,
  layerClasses,
};
