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
  if (!fs.existsSync(pkgPath)) return [];

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  // Exclude common structural/tooling deps that don't need tracking
  const excluded = [
    "react", "react-dom", "react-native", "typescript", 
    "expo", "expo-router", "babel-preset-expo",
    "@types/react", "@types/react-dom", "prettier",
    "@expo/cli", "react-native-web", "react-native-screens",
    "react-native-safe-area-context"
  ];

  return Object.keys(allDeps).filter(d => !excluded.includes(d));
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
      // Handle both specific (import X from "dep") and deep (import X from "dep/utils") imports
      const importRegex = new RegExp(`from\\s+["']${d}(?:/.*)?["']`, "g");
      const requireRegex = new RegExp(`require\\(["']${d}(?:/.*)?["']\\)`, "g");
      
      if (importRegex.test(content) || requireRegex.test(content)) {
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
  const deps = getDependencies();
  const files = walk(mobileRoot);
  const usage = mapUsage(files, deps);

  let md = `# Dependency Map

> **Auto-generated** by \`docs/extractors/dependencies.js\`.
> Maps third-party library usage across the codebase.

## 📦 Library Usage

| Dependency | Used In Features | Files Count |
|------------|------------------|-------------|\n`;

  const unused = [];
  const used = Object.entries(usage).filter(([_, data]) => data.files.length > 0);

  // Sort by usage count descending
  used.sort((a, b) => b[1].files.length - a[1].files.length);

  for (const [dep, data] of used) {
    const features = [...data.features].join(", ");
    md += `| \`${dep}\` | ${features} | ${data.files.length} |\n`;
  }
  md += `\n`;

  for (const [dep, data] of Object.entries(usage)) {
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
  fs.writeFileSync(path.join(projectRoot, "DEPENDENCIES_MAP.md"), md);
  console.log("✅ DEPENDENCIES_MAP.md generated");
}
