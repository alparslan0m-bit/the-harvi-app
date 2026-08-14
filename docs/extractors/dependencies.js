/**
 * ============================================================================
 *  DEPENDENCIES EXTRACTOR
 * ============================================================================
 *
 *  Scans package.json and maps how third-party libraries are used across
 *  different features in the codebase.
 *  Run:  node docs/extractors/dependencies.js
 *
 *  Outputs:
 *    • Dependency usage map (where is X library used?)
 *    • Unused dependency warnings
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const mobileRoot = path.join(projectRoot, "artifacts", "mobile");

// ============================================================================
// 1. WALK SOURCE FILES
// ============================================================================

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const full = path.join(dir, file);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (file === "node_modules" || file === ".expo") continue;
          results = results.concat(walk(full));
        } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
          results.push(full);
        }
      } catch (_) {}
    }
  } catch (_) {}
  return results;
}

// ============================================================================
// 2. GET DEPS FROM PACKAGE.JSON
// ============================================================================

function getDependencies() {
  const pkgPath = path.join(mobileRoot, "package.json");
  if (!fs.existsSync(pkgPath)) return { production: [], dev: [] };

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  // Exclude common structural/tooling deps that don't need tracking
  const excluded = [
    "react", "react-dom", "react-native", "typescript",
    "expo", "expo-router", "babel-preset-expo",
    "@types/react", "@types/react-dom", "prettier",
    "@expo/cli", "react-native-web", "react-native-screens",
    "react-native-safe-area-context"
  ];

  const production = Object.keys(pkg.dependencies || {}).filter(d => !excluded.includes(d));
  const dev = Object.keys(pkg.devDependencies || {}).filter(d => !excluded.includes(d));

  return { production, dev };
}

// Read plugins from app.json to mark them as intentionally used
function getAppJsonPlugins() {
  const appJsonPath = path.join(mobileRoot, "app.json");
  if (!fs.existsSync(appJsonPath)) return new Set();
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    const plugins = appJson.expo?.plugins || [];
    return new Set(
      plugins.map(p => (Array.isArray(p) ? p[0] : p)).filter(Boolean)
    );
  } catch (_) {
    return new Set();
  }
}

// ============================================================================
// 3. MAP USAGE ACROSS FILES
// ============================================================================

function mapUsage(files, deps) {
  const usage = {};
  for (const d of deps) {
    usage[d] = { files: [], features: new Set() };
  }

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");
    
    // Determine which feature this file belongs to
    let feature = "core/shared";
    const featureMatch = relPath.match(/features\/(\w+)\//);
    if (featureMatch) {
      feature = featureMatch[1];
    } else if (relPath.includes("app/")) {
      feature = "routing (app/)";
    }

    for (const d of deps) {
      // Check if file imports the dependency
      // Handle specific (import X from "dep"), deep (import X from "dep/utils"), and side-effect (import "dep") imports
      const importRegex = new RegExp(`from\\s+["']${d}(?:/.*)?["']`, "g");
      const sideEffectRegex = new RegExp(`import\\s+["']${d}(?:/.*)?["']`, "g");
      const requireRegex = new RegExp(`require\\(["']${d}(?:/.*)?["']\\)`, "g");
      
      if (importRegex.test(content) || sideEffectRegex.test(content) || requireRegex.test(content)) {
        usage[d].files.push(relPath);
        usage[d].features.add(feature);
      }
    }
  }

  return usage;
}

// ============================================================================
// 4. GENERATE MARKDOWN
// ============================================================================

function generate() {
  const { production, dev } = getDependencies();
  const allDeps = [...production, ...dev];
  const appJsonPlugins = getAppJsonPlugins();
  const files = walk(mobileRoot);
  const usage = mapUsage(files, allDeps);

  // Mark app.json plugins as used (they link natively, not via imports)
  for (const plugin of appJsonPlugins) {
    if (usage[plugin] && usage[plugin].files.length === 0) {
      usage[plugin].files.push("app.json (plugin)");
      usage[plugin].features.add("native plugin");
    }
  }

  let md = `# Dependency Map

> **Auto-generated** by \`docs/extractors/dependencies.js\`.
> Generated at ${new Date().toISOString()}
> Maps third-party library usage across the codebase.

## 📦 Library Usage

| Dependency | Type | Used In Features | Files Count |
|------------|------|------------------|-------------|\n`;

  const unused = [];
  const used = Object.entries(usage).filter(([_, data]) => data.files.length > 0);

  // Sort by usage count descending
  used.sort((a, b) => b[1].files.length - a[1].files.length);

  for (const [dep, data] of used) {
    const features = [...data.features].join(", ");
    const type = dev.includes(dep) ? "dev" : "prod";
    md += `| \`${dep}\` | ${type} | ${features} | ${data.files.length} |\n`;
  }
  md += `\n`;

  // Only flag PRODUCTION deps that are never imported anywhere
  for (const [dep, data] of Object.entries(usage)) {
    if (!production.includes(dep)) continue; // skip dev deps
    if (data.files.length === 0) {
      // Some deps are tooling (babel plugins, etc) that aren't imported in code
      if (!dep.includes("babel") && !dep.includes("eslint") && !dep.includes("prettier") && !dep.includes("types") && !dep.includes("expo-dev-client")) {
        unused.push(dep);
      }
    }
  }

  if (unused.length > 0) {
    md += `## ⚠️ Potential Unused Dependencies\n\n`;
    md += `These libraries are in \`package.json\` but are never directly imported in \`.ts/.tsx\` files. *(Note: Some may be native modules or plugins that auto-link, like \`expo-dev-client\`)*\n\n`;
    for (const u of unused) {
      md += `- \`${u}\`\n`;
    }
    md += `\n`;
  }

  return md;
}

module.exports = { generate, name: "DEPENDENCIES_MAP.md" };

if (require.main === module) {
  const md = generate();
  fs.mkdirSync(path.join(projectRoot, "docs", "generated"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "docs", "generated", "DEPENDENCIES_MAP.md"), md);
  console.log("✅ docs/generated/DEPENDENCIES_MAP.md generated");
}
