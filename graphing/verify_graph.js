const fs = require("fs");
const path = require("path");

const projectRoot = "c:\\Users\\METRO\\harvi gamed";
const jsonPath = path.join(projectRoot, "graphing", "architecture.json");
const arch = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

// Define node ownership by file paths/patterns
const nodeMapping = {
  app: ["artifacts/mobile/app/_layout.tsx"],
  tab_navigator: [
    "artifacts/mobile/app/(main)/(tabs)/_layout.tsx",
    "artifacts/mobile/app/(main)/(tabs)/CustomTabBar.tsx",
    "artifacts/mobile/app/(main)/(tabs)/index.tsx",
  ],
  auth_feature: [
    "artifacts/mobile/src/features/auth/components",
    "artifacts/mobile/src/features/auth/hooks",
    "artifacts/mobile/app/login.tsx",
  ],
  learn_feature: [
    "artifacts/mobile/src/features/learn/components",
    "artifacts/mobile/src/features/learn/hooks",
    "artifacts/mobile/app/(main)/(tabs)/index.tsx",
    "artifacts/mobile/app/(main)/(learn)",
    "artifacts/mobile/app/(main)/module",
    "artifacts/mobile/app/(main)/subject",
  ],
  quiz_feature: [
    "artifacts/mobile/src/features/quiz/components",
    "artifacts/mobile/src/features/quiz/hooks",
    "artifacts/mobile/app/(main)/quiz",
  ],
  stats_feature: [
    "artifacts/mobile/src/features/stats/components",
    "artifacts/mobile/src/features/stats/hooks",
    "artifacts/mobile/app/(main)/(tabs)/stats.tsx",
    "artifacts/mobile/app/(main)/stats",
  ],
  purchase_feature: [
    "artifacts/mobile/src/features/purchase/components",
    "artifacts/mobile/src/features/purchase/hooks",
    "artifacts/mobile/app/(main)/purchase",
  ],
  profile_feature: [
    "artifacts/mobile/src/features/profile/components",
    "artifacts/mobile/src/features/profile/hooks",
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
  offline_banner: ["artifacts/mobile/src/shared/components/OfflineBanner.tsx"],
  feedback_form: ["artifacts/mobile/src/shared/components/FeedbackForm.tsx"],
  error_boundary: ["artifacts/mobile/src/shared/components/ErrorBoundary.tsx"],
};

// External mapping by import string
const externalMapping = {
  "expo-secure-store": "secure_store",
  "@react-native-async-storage/async-storage": "async_storage",
  "react-native-purchases": "revenuecat",
  "@react-native-community/netinfo": "netinfo",
  "expo-web-browser": "google_oauth",
  "@tanstack/react-query": "react_query",
};

function getFileNode(filePath) {
  const relative = path.relative(projectRoot, filePath).replace(/\\/g, "/");
  for (const [node, patterns] of Object.entries(nodeMapping)) {
    for (const pat of patterns) {
      if (relative.startsWith(pat) || relative === pat) {
        return node;
      }
    }
  }
  return null;
}

function resolveImportNode(importPath, currentFilePath) {
  // Check external
  for (const [ext, node] of Object.entries(externalMapping)) {
    if (importPath.includes(ext)) return node;
  }

  if (importPath.startsWith("@/")) {
    const fullPathTsx = path.join(
      projectRoot,
      "artifacts/mobile",
      importPath.substring(2) + ".tsx",
    );
    const fullPathTs = path.join(
      projectRoot,
      "artifacts/mobile",
      importPath.substring(2) + ".ts",
    );
    const fullPathDir = path.join(
      projectRoot,
      "artifacts/mobile",
      importPath.substring(2),
    );

    let resolved = fs.existsSync(fullPathTsx)
      ? fullPathTsx
      : fs.existsSync(fullPathTs)
        ? fullPathTs
        : null;
    if (!resolved && fs.existsSync(fullPathDir)) {
      resolved = fs.existsSync(path.join(fullPathDir, "index.ts"))
        ? path.join(fullPathDir, "index.ts")
        : path.join(fullPathDir, "index.tsx");
    }
    return resolved ? getFileNode(resolved) : null;
  }

  if (importPath.startsWith(".")) {
    const dir = path.dirname(currentFilePath);
    const fullPathTsx = path.join(dir, importPath + ".tsx");
    const fullPathTs = path.join(dir, importPath + ".ts");
    let resolved = fs.existsSync(fullPathTsx)
      ? fullPathTsx
      : fs.existsSync(fullPathTs)
        ? fullPathTs
        : null;
    if (!resolved) {
      const fullDir = path.join(dir, importPath);
      if (fs.existsSync(fullDir)) {
        resolved = fs.existsSync(path.join(fullDir, "index.ts"))
          ? path.join(fullDir, "index.ts")
          : path.join(fullDir, "index.tsx");
      }
    }
    return resolved ? getFileNode(resolved) : null;
  }
  return null;
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(projectRoot, "artifacts/mobile"));
const empiricalEdges = new Set();

files.forEach((file) => {
  const fromNode = getFileNode(file);
  if (!fromNode) return;

  const content = fs.readFileSync(file, "utf8");
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const toNode = resolveImportNode(importPath, file);
    if (toNode && fromNode !== toNode) {
      empiricalEdges.add(`${fromNode}->${toNode}`);
    }
  }
});

// Also manually add implicit or navigation edges if they aren't standard imports
const implicitEdges = [
  "app->auth_feature",
  "app->tab_navigator",
  "app->quiz_feature",
  "app->purchase_feature",
  "tab_navigator->learn_feature",
  "tab_navigator->stats_feature",
  "tab_navigator->profile_feature",
  "learn_feature->purchase_feature",
  "learn_feature->quiz_feature",
  "auth_store->supabase_client",
  "supabase_client->supabase_auth",
  "supabase_client->supabase_db",
  "supabase_functions->supabase_db",
  "purchase_store->supabase_functions",
  "profile_feature->supabase_client",
];
implicitEdges.forEach((e) => empiricalEdges.add(e));

const definedEdges = new Set(arch.edges.map((e) => `${e.source}->${e.target}`));

console.log("=== EMPIRICAL EDGES NOT IN GRAPH (False Negatives) ===");
const missingInGraph = [];
empiricalEdges.forEach((e) => {
  if (!definedEdges.has(e)) missingInGraph.push(e);
});
console.log(missingInGraph.join("\n") || "None!");

console.log(
  "\n=== GRAPH EDGES NOT IN EMPIRICAL (Potential False Positives) ===",
);
const missingInEmpirical = [];
definedEdges.forEach((e) => {
  if (!empiricalEdges.has(e)) missingInEmpirical.push(e);
});
console.log(missingInEmpirical.join("\n") || "None!");
