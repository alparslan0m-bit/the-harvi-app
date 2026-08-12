/**
 * ============================================================================
 *  CONVENTIONS EXTRACTOR
 * ============================================================================
 *
 *  Scans the codebase for recurring structural patterns and documents them
 *  as conventions. Not style rules — structural patterns that agents must follow.
 *  Run:  node docs/extractors/conventions.js
 *
 *  Outputs:
 *    • Feature folder structure conventions
 *    • Store patterns
 *    • Service patterns
 *    • Import conventions
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const mobileRoot = path.join(projectRoot, "artifacts", "mobile");
const srcRoot = path.join(mobileRoot, "src");
const appRoot = path.join(mobileRoot, "app");

// ============================================================================
// 1. ANALYZE FEATURE FOLDER STRUCTURE
// ============================================================================

function analyzeFeatureFolders() {
  const featuresDir = path.join(srcRoot, "features");
  if (!fs.existsSync(featuresDir)) return [];

  const features = [];
  const featureDirs = fs
    .readdirSync(featuresDir)
    .filter((f) =>
      fs.statSync(path.join(featuresDir, f)).isDirectory(),
    );

  for (const feature of featureDirs) {
    const featurePath = path.join(featuresDir, feature);
    const contents = fs.readdirSync(featurePath);
    const subdirs = contents.filter((f) =>
      fs.statSync(path.join(featurePath, f)).isDirectory(),
    );
    const files = contents.filter(
      (f) => !fs.statSync(path.join(featurePath, f)).isDirectory(),
    );

    features.push({
      name: feature,
      subdirs,
      rootFiles: files,
    });
  }

  return features;
}

// ============================================================================
// 2. ANALYZE STORE PATTERNS
// ============================================================================

function analyzeStorePatterns() {
  const storeDir = path.join(srcRoot, "shared", "store");
  if (!fs.existsSync(storeDir)) return [];

  const stores = [];
  const files = fs
    .readdirSync(storeDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

  for (const file of files) {
    if (file === "index.ts") continue;
    const content = fs.readFileSync(path.join(storeDir, file), "utf8");
    const storeName = file.replace(/\.(ts|tsx)$/, "");

    stores.push({
      name: storeName,
      file,
      usesZustand: content.includes("create(") || content.includes("zustand"),
      hasProvider:
        content.includes("Provider") || content.includes("function") && content.includes("Provider"),
      hasHook: /export\s+function\s+use\w+/.test(content),
      hasAsyncStorage: content.includes("AsyncStorage"),
      hasSupabase: content.includes("supabase"),
      hasQueryClient: content.includes("useQueryClient"),
    });
  }

  return stores;
}

// ============================================================================
// 3. ANALYZE SERVICE PATTERNS
// ============================================================================

function analyzeServicePatterns() {
  const services = [];

  // Walk all services in features and shared
  function findServices(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (item === "services") {
          // Found a services directory
          const svcFiles = fs
            .readdirSync(full)
            .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
          for (const svcFile of svcFiles) {
            const content = fs.readFileSync(
              path.join(full, svcFile),
              "utf8",
            );
            const relPath = path
              .relative(projectRoot, path.join(full, svcFile))
              .replace(/\\/g, "/");

            services.push({
              name: svcFile.replace(/\.(ts|tsx)$/, ""),
              file: relPath,
              hasMemCache:
                content.includes("memCache") ||
                content.includes("Map()") ||
                content.includes("new Map"),
              hasAsyncStorageCache: content.includes("AsyncStorage"),
              hasSupabaseFetch: content.includes("supabase.from") || content.includes("supabase.rpc"),
              hasOfflineCheck:
                content.includes("isOnline") ||
                content.includes("NetInfo"),
              hasCacheTiers:
                content.includes("memCache") &&
                content.includes("AsyncStorage") &&
                (content.includes("supabase.from") || content.includes("supabase.rpc")),
            });
          }
        } else if (item !== "node_modules" && item !== ".expo") {
          findServices(full);
        }
      }
    }
  }

  findServices(srcRoot);
  return services;
}

// ============================================================================
// 4. ANALYZE THIN SHELL PATTERN
// ============================================================================

function analyzeThinShells() {
  const shells = [];

  function walkRoutes(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walkRoutes(full, `${prefix}${item}/`);
      } else if (
        (item.endsWith(".tsx") || item.endsWith(".ts")) &&
        item !== "_layout.tsx" &&
        item !== "+not-found.tsx"
      ) {
        const content = fs.readFileSync(full, "utf8");
        const lines = content.split("\n").length;
        const hasExportDefault = /export\s+default/.test(content) || /export\s*\{[^}]*default/.test(content);
        const isReExportOnly = lines <= 5 && hasExportDefault;

        shells.push({
          route: `${prefix}${item}`,
          file: path
            .relative(projectRoot, full)
            .replace(/\\/g, "/"),
          lines,
          isReExportOnly,
          isThinShell: isReExportOnly,
        });
      }
    }
  }

  walkRoutes(appRoot);
  return shells;
}

// ============================================================================
// 5. ANALYZE IMPORT CONVENTIONS
// ============================================================================

function analyzeImportConventions() {
  const conventions = {
    aliasImports: 0, // @/ imports
    relativeImports: 0, // ./ or ../ imports
    totalFiles: 0,
    crossFeatureImports: [], // features importing from other features (violation)
  };

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (item === "node_modules" || item === ".expo") continue;
          walk(full);
        } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
          conventions.totalFiles++;
          const content = fs.readFileSync(full, "utf8");
          const relPath = path
            .relative(projectRoot, full)
            .replace(/\\/g, "/");

          // Count import styles
          const aliasMatches = content.match(/from\s+["']@\//g);
          const relMatches = content.match(/from\s+["']\.\//g);
          if (aliasMatches) conventions.aliasImports += aliasMatches.length;
          if (relMatches) conventions.relativeImports += relMatches.length;

          // Detect cross-feature imports
          const featureMatch = relPath.match(
            /features\/(\w+)\//,
          );
          if (featureMatch) {
            const thisFeature = featureMatch[1];
            const crossImportRegex =
              /from\s+["'].*features\/(\w+)\//g;
            let crossMatch;
            while (
              (crossMatch = crossImportRegex.exec(content)) !== null
            ) {
              if (crossMatch[1] !== thisFeature) {
                conventions.crossFeatureImports.push({
                  from: relPath,
                  importsFrom: crossMatch[1],
                });
              }
            }
          }
        }
      } catch (_) {}
    }
  }

  walk(srcRoot);
  return conventions;
}

// ============================================================================
// 6. GENERATE MARKDOWN
// ============================================================================

function generate() {
  const features = analyzeFeatureFolders();
  const stores = analyzeStorePatterns();
  const services = analyzeServicePatterns();
  const shells = analyzeThinShells();
  const imports = analyzeImportConventions();

  let md = `# Conventions

> **Auto-generated** by \`docs/extractors/conventions.js\`.
> Structural patterns extracted from the codebase. Follow these when adding new code.

`;

  // ── Feature Folder Convention ───────────────────────────────────────────
  md += `## 📁 Feature Folder Structure\n\n`;
  md += `Each feature in \`src/features/\` follows this structure:\n\n`;
  md += `\`\`\`\n`;
  md += `src/features/{feature}/\n`;

  // Find the union of all subdirs across features
  const allSubdirs = new Set();
  for (const f of features) {
    for (const s of f.subdirs) allSubdirs.add(s);
  }
  for (const s of [...allSubdirs].sort()) {
    md += `├── ${s}/\n`;
  }
  md += `└── index.ts (barrel export)\n`;
  md += `\`\`\`\n\n`;

  md += `| Feature | Subdirectories | Root Files |\n`;
  md += `|---------|----------------|------------|\n`;
  for (const f of features) {
    md += `| **${f.name}** | ${f.subdirs.join(", ")} | ${f.rootFiles.join(", ") || "—"} |\n`;
  }
  md += `\n`;

  // ── Thin Shell Convention ───────────────────────────────────────────────
  md += `## 🐚 Thin Shell Pattern (Route Files)\n\n`;
  md += `Route files in \`app/\` must only re-export from \`src/features/\`. No logic allowed.\n\n`;

  const thinShells = shells.filter((s) => s.isThinShell);
  const violations = shells.filter((s) => !s.isThinShell);

  md += `- ✅ **${thinShells.length}** route files follow the thin shell pattern\n`;
  if (violations.length > 0) {
    md += `- ⚠️ **${violations.length}** route files may contain logic:\n`;
    for (const v of violations) {
      md += `  - \`${v.file}\` (${v.lines} lines)\n`;
    }
  }
  md += `\n`;

  // ── Store Convention ────────────────────────────────────────────────────
  md += `## 🏪 Store Pattern (Zustand)\n\n`;
  md += `Every store follows: **Zustand create** + **Provider component** + **useXxx hook**\n\n`;
  md += `| Store | Zustand | Provider | Hook | AsyncStorage | Supabase | QueryClient |\n`;
  md += `|-------|---------|----------|------|-------------|----------|-------------|\n`;
  for (const s of stores) {
    md += `| \`${s.name}\` | ${s.usesZustand ? "✅" : "❌"} | ${s.hasProvider ? "✅" : "❌"} | ${s.hasHook ? "✅" : "❌"} | ${s.hasAsyncStorage ? "✅" : "❌"} | ${s.hasSupabase ? "✅" : "❌"} | ${s.hasQueryClient ? "✅" : "❌"} |\n`;
  }
  md += `\n`;

  // ── Service Convention ──────────────────────────────────────────────────
  md += `## ⚙️ Service Pattern\n\n`;
  md += `Services use a three-tier cache strategy: **memCache → AsyncStorage → Supabase**\n\n`;
  md += `| Service | Mem Cache | AsyncStorage | Supabase | Offline Check | Full 3-Tier |\n`;
  md += `|---------|-----------|-------------|----------|---------------|-------------|\n`;
  for (const s of services) {
    md += `| \`${s.name}\` | ${s.hasMemCache ? "✅" : "❌"} | ${s.hasAsyncStorageCache ? "✅" : "❌"} | ${s.hasSupabaseFetch ? "✅" : "❌"} | ${s.hasOfflineCheck ? "✅" : "❌"} | ${s.hasCacheTiers ? "✅" : "❌"} |\n`;
  }
  md += `\n`;

  // ── Import Convention ───────────────────────────────────────────────────
  md += `## 📦 Import Conventions\n\n`;
  md += `- **Alias imports (\`@/\`):** ${imports.aliasImports} usages across ${imports.totalFiles} files\n`;
  md += `- **Relative imports (\`./\`):** ${imports.relativeImports} usages\n`;
  md += `- **Convention:** Use \`@/\` for cross-feature imports, \`./\` for intra-directory\n\n`;

  if (imports.crossFeatureImports.length > 0) {
    md += `### ⚠️ Cross-Feature Import Violations\n\n`;
    md += `Features should not import directly from other features. Use \`shared/\` instead.\n\n`;
    md += `| File | Imports From Feature |\n`;
    md += `|------|---------------------|\n`;
    for (const v of imports.crossFeatureImports) {
      md += `| \`${v.from}\` | ${v.importsFrom} |\n`;
    }
    md += `\n`;
  } else {
    md += `> ✅ No cross-feature import violations detected.\n\n`;
  }

  return md;
}

module.exports = { generate, name: "CONVENTIONS.md" };

if (require.main === module) {
  const md = generate();
  fs.writeFileSync(path.join(projectRoot, "CONVENTIONS.md"), md);
  console.log("✅ CONVENTIONS.md generated");
}
