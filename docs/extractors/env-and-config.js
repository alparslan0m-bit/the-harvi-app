/**
 * ============================================================================
 *  ENV & CONFIG EXTRACTOR
 * ============================================================================
 *
 *  Extracts required environment variables, Expo configuration, and EAS profiles
 *  to document the app's build and runtime requirements.
 *  Run:  node docs/extractors/env-and-config.js
 *
 *  Outputs:
 *    • EXPO_PUBLIC_* variables used in the codebase
 *    • Expo plugins and permissions required
 *    • EAS build profiles
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
// 2. EXTRACT ENVIRONMENT VARIABLES
// ============================================================================

function extractEnvVars(files) {
  const envVars = new Map();

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");

    // Match process.env.EXPO_PUBLIC_XXX and process.env["EXPO_PUBLIC_XXX"]
    const envRegex = /process\.env(?:\.(EXPO_PUBLIC_[A-Z0-9_]+)|\[["'](EXPO_PUBLIC_[A-Z0-9_]+)["']\])/g;
    let match;
    while ((match = envRegex.exec(content)) !== null) {
      const v = match[1] || match[2];
      if (!envVars.has(v)) {
        envVars.set(v, []);
      }
      if (!envVars.get(v).includes(relPath)) {
        envVars.get(v).push(relPath);
      }
    }
  }

  return envVars;
}

// ============================================================================
// 3. EXTRACT APP.JSON CONFIG
// ============================================================================

function extractAppConfig() {
  const appJsonPath = path.join(mobileRoot, "app.json");
  if (!fs.existsSync(appJsonPath)) return null;

  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    return appJson.expo;
  } catch (e) {
    return null;
  }
}

// ============================================================================
// 4. EXTRACT EAS.JSON PROFILES
// ============================================================================

function extractEasConfig() {
  const easPath = path.join(mobileRoot, "eas.json");
  // Also check workspace root if not in mobile
  const rootEasPath = path.join(projectRoot, "eas.json");
  
  let targetPath = fs.existsSync(easPath) ? easPath : null;
  if (!targetPath && fs.existsSync(rootEasPath)) {
    targetPath = rootEasPath;
  }

  if (!targetPath) return null;

  try {
    return JSON.parse(fs.readFileSync(targetPath, "utf8"));
  } catch (e) {
    return null;
  }
}

// ============================================================================
// 5. GENERATE MARKDOWN
// ============================================================================

function generate() {
  const files = walk(mobileRoot);
  const envVars = extractEnvVars(files);
  const appConfig = extractAppConfig();
  const easConfig = extractEasConfig();

  let md = `# Environment & Configuration

> **Auto-generated** by \`docs/extractors/env-and-config.js\`.
> Generated at ${new Date().toISOString()}
> Maps required environment variables, Expo plugins, and build profiles.

`;

  // ── Environment Variables ───────────────────────────────────────────────
  md += `## 🔐 Environment Variables\n\n`;
  if (envVars.size > 0) {
    md += `| Variable | Used In |\n`;
    md += `|----------|---------|\n`;
    for (const [v, usages] of [...envVars.entries()].sort()) {
      // Limit list of usages for brevity
      const displayUsages = usages.length > 3 
        ? `${usages.slice(0, 3).map(u => `\`${path.basename(u)}\``).join(", ")} + ${usages.length - 3} more`
        : usages.map(u => `\`${path.basename(u)}\``).join(", ");
        
      md += `| \`${v}\` | ${displayUsages} |\n`;
    }
  } else {
    md += `> No \`process.env.EXPO_PUBLIC_*\` usage found in the codebase.\n`;
  }
  md += `\n`;

  // ── App Configuration ───────────────────────────────────────────────────
  if (appConfig) {
    md += `## 📱 App Configuration (\`app.json\`)\n\n`;
    
    md += `### Core Info\n`;
    md += `- **Name:** ${appConfig.name}\n`;
    md += `- **Slug:** ${appConfig.slug}\n`;
    md += `- **Scheme:** ${appConfig.scheme || "—"}\n`;
    md += `- **iOS Bundle ID:** ${appConfig.ios?.bundleIdentifier || "—"}\n`;
    md += `- **Android Package:** ${appConfig.android?.package || "—"}\n\n`;

    if (appConfig.plugins && appConfig.plugins.length > 0) {
      md += `### 🔌 Expo Plugins\n\n`;
      for (const p of appConfig.plugins) {
        if (typeof p === "string") {
          md += `- \`${p}\`\n`;
        } else if (Array.isArray(p)) {
          md += `- \`${p[0]}\`\n`;
        }
      }
      md += `\n`;
    }

    if (appConfig.experiments) {
      md += `### 🧪 Experiments\n\n`;
      md += `\`\`\`json\n`;
      md += JSON.stringify(appConfig.experiments, null, 2) + "\n";
      md += `\`\`\`\n\n`;
    }
  }

  // ── EAS Configuration ───────────────────────────────────────────────────
  if (easConfig && easConfig.build) {
    md += `## 🏗️ EAS Build Profiles (\`eas.json\`)\n\n`;
    md += `| Profile | Distribution | Dev Client | Auto Increment |\n`;
    md += `|---------|--------------|------------|----------------|\n`;
    
    for (const [profileName, profileData] of Object.entries(easConfig.build)) {
      const dist = profileData.distribution || "—";
      const devClient = profileData.developmentClient ? "✅" : "—";
      const autoInc = profileData.autoIncrement ? "✅" : "—";
      md += `| \`${profileName}\` | ${dist} | ${devClient} | ${autoInc} |\n`;
    }
    md += `\n`;
  }

  return md;
}

module.exports = { generate, name: "ENV_AND_CONFIG.md" };

if (require.main === module) {
  const md = generate();
  fs.mkdirSync(path.join(projectRoot, "docs", "generated"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "docs", "generated", "ENV_AND_CONFIG.md"), md);
  console.log("✅ docs/generated/ENV_AND_CONFIG.md generated");
}
