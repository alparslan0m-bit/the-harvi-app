/**
 * archgovern config for the Harvi project.
 *
 * This reproduces the exact governance behavior of the original
 * `graphing/verify_graph.js` engine using nothing but config — no code
 * changes. It is an EXAMPLE of how a project-agnostic config looks in
 * practice, and it is the fixture used by `examples/harvi/compare.js` to
 * prove archgovern's output matches the legacy engine.
 */

const path = require("path");

// Workspace root (this config lives in archgovern/examples/harvi/).
const ROOT = path.resolve(__dirname, "..", "..", "..");

module.exports = {
  // Override projectRoot so all relative paths below resolve from the
  // Harvi workspace root even though this config sits in a subfolder.
  projectRoot: ROOT,

  projectName: "Harvi",

  sourceRoots: ["artifacts/mobile"],
  fileExtensions: [".ts", ".tsx"],
  skipDirs: ["node_modules", ".expo"],

  // "@/foo" resolves to <sourceRoot>/foo (the original engine's behavior).
  aliases: { "@": "" },

  nodeMapping: {
    app: ["artifacts/mobile/app/_layout.tsx"],
    tab_navigator: ["artifacts/mobile/app/(main)/(tabs)/_layout.tsx"],
    auth_feature: ["artifacts/mobile/src/features/auth", "artifacts/mobile/app/(auth)"],
    learn_feature: [
      "artifacts/mobile/src/features/learn",
      "artifacts/mobile/app/(main)/(tabs)/(learn)",
    ],
    quiz_feature: ["artifacts/mobile/src/features/quiz", "artifacts/mobile/app/(main)/quiz"],
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
    hierarchy_service: ["artifacts/mobile/src/features/learn/services/hierarchyService.ts"],
    access_service: ["artifacts/mobile/src/features/learn/services/accessService.ts"],
    progress_service: ["artifacts/mobile/src/features/learn/services/progressService.ts"],
    best_score_service: ["artifacts/mobile/src/features/learn/services/bestScoreService.ts"],
    question_service: ["artifacts/mobile/src/features/quiz/services/questionService.ts"],
    stats_service: ["artifacts/mobile/src/features/stats/services/statsService.ts"],
    question_cache: ["artifacts/mobile/src/features/quiz/services/questionCache.ts"],
    offline_queue: ["artifacts/mobile/src/shared/services/offlineQueue.ts"],
    supabase_client: ["artifacts/mobile/src/shared/services/supabase.ts"],
    offline_banner: ["artifacts/mobile/src/shared/components/OfflineBanner.tsx"],
    feedback_form: ["artifacts/mobile/src/shared/components/FeedbackForm.tsx"],
    error_boundary: ["artifacts/mobile/src/shared/components/ErrorBoundary.tsx"],
    shared_utils: [
      "artifacts/mobile/src/shared/utils/netInfo.ts",
      "artifacts/mobile/src/shared/utils/cacheUtils.ts",
    ],
    database: ["artifacts/mobile/src/db"],
    mmkv: ["artifacts/mobile/src/shared/storage/mmkv.ts"],
  },

  externalPackageMap: {
    "expo-secure-store": "secure_store",
    "expo-sqlite": "sqlite",
    "drizzle-orm": "sqlite",
    "react-native-mmkv": "mmkv",
    zustand: "zustand",
    "react-native-purchases": "revenuecat",
    "@react-native-community/netinfo": "netinfo",
    "expo-web-browser": "google_oauth",
    "@tanstack/react-query": "react_query",
  },

  remoteNodes: {
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
  },

  // supabase_client -> remotes when createClient() is seen.
  implicitEdges: [
    {
      source: "supabase_client",
      targets: ["supabase_auth", "supabase_db"],
      marker: /createClient(?:WithOptions)?\(/,
    },
  ],

  // supabase_functions -> supabase_db: edge functions bind the client to a
  // non-default name (supabaseAdmin), so extra DB-access verbs are matched.
  remoteEdges: [
    {
      source: "supabase_functions",
      target: "supabase_db",
      dir: "supabase/functions",
      extraPatterns: [/\.from\(/, /\.rpc\(/, /\.insert\(/],
    },
  ],

  derivedFacts: [
    {
      name: "sqliteTables",
      applyTo: ["sqlite"],
      files: [{ type: "file", path: "artifacts/mobile/src/db/schema.ts" }],
      extract: (entries) => {
        const tables = [];
        const re = /sqliteTable\(\s*["']([^"']+)["']/g;
        for (const entry of entries) {
          let m;
          while ((m = re.exec(entry.content)) !== null) {
            if (!tables.includes(m[1])) tables.push(m[1]);
          }
        }
        return tables;
      },
      description: (tables, node) =>
        tables.length
          ? `On-device relational database (harvi.db) via expo-sqlite with Drizzle ORM. PRAGMA-tuned (WAL, synchronous=NORMAL, foreign_keys=ON, cache_size=-8000, busy_timeout=5000). Migrated with Drizzle useMigrations; cold-start maintenance (runColdStartMaintenance) purges synced quiz_results older than 30 days, debounces PRAGMA optimize hourly, and throttles VACUUM to monthly. Tables: ${tables.join(", ")}`
          : null,
    },
    {
      name: "supabaseDb",
      applyTo: ["supabase_db"],
      files: [{ type: "dir", path: "supabase/migrations", filter: /\.sql$/ }],
      extract: (entries) => {
        const tables = [];
        const rpcs = [];
        const tableRe =
          /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gi;
        const fnRe =
          /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
        for (const entry of entries) {
          let m;
          while ((m = tableRe.exec(entry.content)) !== null) {
            if (!tables.includes(m[1])) tables.push(m[1]);
          }
          while ((m = fnRe.exec(entry.content)) !== null) {
            if (!rpcs.includes(m[1])) rpcs.push(m[1]);
          }
        }
        return { tables, rpcs };
      },
      description: (data, node) => {
        const parts = [];
        if (data.tables.length > 0) parts.push(`Tables: ${data.tables.join(", ")}`);
        if (data.rpcs.length > 0) parts.push(`RPCs/functions: ${data.rpcs.join(", ")}`);
        return parts.length > 0 ? `PostgreSQL backend. ${parts.join(". ")}` : null;
      },
    },
    {
      name: "supabaseFunctions",
      applyTo: ["supabase_functions"],
      files: [{ type: "dirNames", path: "supabase/functions" }],
      extract: (entries) => entries.map((e) => e.path),
      description: (names, node) =>
        names.length
          ? `Serverless Deno backend. Functions: ${names.join(", ")}. record-iap authenticates the caller, validates module/transaction/store input, enforces idempotency + receipt-replay protection, optionally verifies the transaction server-side with RevenueCat, blocks double-buys, and records entitlements in the purchases table`
          : null,
    },
  ],

  curatedContentBans: [
    { phrase: "statsCache", reason: "cacheStore no longer holds statsCache — SQLite + React Query replaced it" },
    { phrase: "warmedStats", reason: "cacheStore no longer holds warmedStats" },
    { phrase: "memCache", reason: "no module-level memCache exists — Drizzle useLiveQuery over SQLite replaced it" },
    { phrase: "clearStatsCache", reason: "deleted function — clearing is now clearAllUserCaches(uid)" },
    { phrase: "clearProgressCache", reason: "deleted function — clearing is now clearAllUserCaches(uid)" },
    { phrase: "clearBestScoreCache", reason: "deleted function — clearing is now clearAllUserCaches(uid)" },
    { phrase: "23xxx", reason: "wrong code — the duplicate-row error is Postgres 23505" },
    { phrase: "not currently rendered", reason: "offline_banner IS rendered globally via GlobalOfflineBanner" },
    { phrase: "Mastered, In Progress, Not Started", reason: "wrong mastery filter labels — actual chips are All, Strong, Improving, Needs Work" },
    { phrase: "with user.id parameter", reason: "MasteryScreen is pushed without params — it reads the user from useAuth" },
    { phrase: "confetti", reason: "no confetti exists anywhere in the codebase — SuccessState renders an animated success orb + Done button" },
  ],

  orderedLayers: ["presentation", "application", "infrastructure", "external"],

  layerClasses: {
    presentation: "fill:#f472b6,stroke:#831843,stroke-width:2px,color:#000",
    application: "fill:#60a5fa,stroke:#1e3a8a,stroke-width:2px,color:#000",
    infrastructure: "fill:#fbbf24,stroke:#78350f,stroke-width:2px,color:#000",
    external: "fill:#a1a1aa,stroke:#3f3f46,stroke-width:2px,color:#000",
    unknown: "fill:#52525b,stroke:#3f3f46,stroke-width:2px,stroke-dasharray:5 5,color:#e4e4e7",
  },

  // Outputs — kept inside the example so the Harvi root artifacts are untouched.
  dataDir: "archgovern/examples/harvi/data",
  jsonFile: "archgovern/examples/harvi/architecture.json",
  htmlFile: "archgovern/examples/harvi/architecture.html",
  mdFile: "archgovern/examples/harvi/ARCHITECTURE.md",
  chartsMdFile: "archgovern/examples/harvi/ARCHITECTURE_CHARTS.md",
};
