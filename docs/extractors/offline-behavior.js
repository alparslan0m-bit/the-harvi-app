/**
 * ============================================================================
 *  OFFLINE BEHAVIOR EXTRACTOR
 * ============================================================================
 *
 *  Scans for NetInfo usage, isOnline checks, AsyncStorage fallbacks, and
 *  offline queue patterns to document offline capabilities per feature.
 *  Run:  node docs/extractors/offline-behavior.js
 *
 *  Outputs:
 *    • Per-feature offline capability matrix
 *    • Sync pipeline documentation
 *    • Cache/fallback patterns
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const mobileRoot = path.join(projectRoot, "artifacts", "mobile");

// ============================================================================
// 1. WALK
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
// 2. ANALYZE OFFLINE PATTERNS
// ============================================================================

function analyzeOfflinePatterns(files) {
  const features = {};

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");

    // Determine which feature this file belongs to
    let feature = null;
    const featureMatch = relPath.match(
      /features\/(\w+)\//,
    );
    if (featureMatch) {
      feature = featureMatch[1];
    } else if (relPath.includes("shared/store/")) {
      feature = "shared_stores";
    } else if (relPath.includes("shared/services/")) {
      feature = "shared_services";
    } else if (relPath.includes("shared/")) {
      feature = "shared";
    } else {
      continue;
    }

    if (!features[feature]) {
      features[feature] = {
        files: [],
        hasNetInfoCheck: false,
        hasIsOnlineCheck: false,
        hasAsyncStorageFallback: false,
        hasOfflineQueue: false,
        hasCacheFallback: false,
        hasMemCache: false,
        supabaseCalls: 0,
        offlinePatterns: [],
      };
    }

    features[feature].files.push(relPath);

    // ── NetInfo usage ────────────────────────────────────────────────────
    if (content.includes("NetInfo") || content.includes("netinfo")) {
      features[feature].hasNetInfoCheck = true;
    }

    // ── isOnline checks ──────────────────────────────────────────────────
    if (
      content.includes("isOnline") ||
      content.includes("is_online") ||
      content.match(/fetch.*addEventListener|addEventListener.*fetch/)
    ) {
      features[feature].hasIsOnlineCheck = true;
    }

    // ── AsyncStorage fallback pattern ────────────────────────────────────
    // Pattern: try supabase → catch → fall back to AsyncStorage
    if (
      content.includes("AsyncStorage") &&
      (content.includes("catch") || content.includes("fallback") || content.includes("offline"))
    ) {
      features[feature].hasAsyncStorageFallback = true;

      // Detect specific patterns
      if (content.match(/catch[\s\S]*?AsyncStorage\.getItem/)) {
        features[feature].offlinePatterns.push({
          file: relPath,
          pattern: "Network error → AsyncStorage fallback",
        });
      }
    }

    // ── Offline queue pattern ────────────────────────────────────────────
    // Only flag files that actively ENQUEUE or FLUSH — not barrel re-exports
    if (
      content.match(/\benqueue\b|getQueue\(|flushQueue\(|QUEUE_KEY\s*=/) ||
      (content.includes("quiz_queue") && content.match(/\bpush\b|\bsplice\b|\bshift\b/))
    ) {
      features[feature].hasOfflineQueue = true;
      features[feature].offlinePatterns.push({
        file: relPath,
        pattern: "Offline queue (enqueue → sync later)",
      });
    }

    // ── Cache-first pattern ──────────────────────────────────────────────
    if (content.includes("memCache") || content.includes("mem_cache")) {
      features[feature].hasMemCache = true;
      features[feature].offlinePatterns.push({
        file: relPath,
        pattern: "Memory cache (memCache)",
      });
    }

    if (
      content.includes("AsyncStorage.getItem") &&
      content.includes("supabase")
    ) {
      features[feature].hasCacheFallback = true;
    }

    // ── Count supabase calls ─────────────────────────────────────────────
    const supabaseMatches = content.match(
      /supabase\.(from|rpc|auth|functions)/g,
    );
    if (supabaseMatches) {
      features[feature].supabaseCalls += supabaseMatches.length;
    }
  }

  return features;
}

// ============================================================================
// 3. DETECT SYNC PIPELINE
// ============================================================================

function detectSyncPipeline(files) {
  const steps = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");

    // Detect sync trigger (NetInfo subscribe)
    if (content.includes("NetInfo") && content.includes("subscribe")) {
      steps.push({
        order: 1,
        description: "NetInfo detects connectivity change",
        file: relPath,
      });
    }

    // Detect flush function
    if (
      content.includes("flush") &&
      (content.includes("offlineQueue") || content.includes("getQueue"))
    ) {
      steps.push({
        order: 2,
        description: "Flush drains offline queue",
        file: relPath,
      });
    }

    // Detect batch insert
    if (
      content.includes("quiz_results") &&
      content.includes("insert") &&
      (content.includes("flush") || content.includes("sync"))
    ) {
      steps.push({
        order: 3,
        description: "Batch insert to supabase.from('quiz_results')",
        file: relPath,
      });
    }

    // Detect invalidation after sync
    if (
      content.includes("invalidateQueries") &&
      (content.includes("flush") || content.includes("sync"))
    ) {
      steps.push({
        order: 4,
        description: "Invalidate query caches (stats, progress)",
        file: relPath,
      });
    }

    // Detect timeout/backoff
    if (content.includes("timeout") || content.includes("backoff")) {
      const timeoutMatch = content.match(/(\d+)\s*(?:\*\s*1000)?.*timeout/i);
      if (timeoutMatch) {
        steps.push({
          order: 5,
          description: `Timeout: ${timeoutMatch[1]}s, with backoff on failure`,
          file: relPath,
        });
      }
    }
  }

  return steps.sort((a, b) => a.order - b.order);
}

// ============================================================================
// 4. GENERATE MARKDOWN
// ============================================================================

function generate() {
  const files = walk(mobileRoot);
  const features = analyzeOfflinePatterns(files);
  const syncPipeline = detectSyncPipeline(files);

  let md = `# Offline Behavior

> **Auto-generated** by \`docs/extractors/offline-behavior.js\`.
> Generated at ${new Date().toISOString()}
> Documents what each feature does when the device is offline.

`;

  // ── Feature Capability Matrix ───────────────────────────────────────────
  md += `## 📡 Feature Offline Capability Matrix\n\n`;
  md += `| Feature | Supabase Calls | Cache Fallback | Offline Queue | Mem Cache | NetInfo Check |\n`;
  md += `|---------|----------------|----------------|---------------|-----------|---------------|\n`;

  for (const [feature, data] of Object.entries(features).sort()) {
    const capability =
      data.hasOfflineQueue
        ? "✅ Queue"
        : data.hasCacheFallback
          ? "✅ Cache"
          : data.supabaseCalls > 0
            ? "❌ Requires network"
            : "— (no API calls)";

    md += `| **${feature}** | ${data.supabaseCalls} | ${data.hasCacheFallback || data.hasAsyncStorageFallback ? "✅" : "❌"} | ${data.hasOfflineQueue ? "✅" : "❌"} | ${data.hasMemCache ? "✅" : "❌"} | ${data.hasNetInfoCheck || data.hasIsOnlineCheck ? "✅" : "❌"} |\n`;
  }
  md += `\n`;

  // ── Detailed Patterns ───────────────────────────────────────────────────
  md += `## 🔍 Detailed Offline Patterns\n\n`;

  for (const [feature, data] of Object.entries(features).sort()) {
    if (data.offlinePatterns.length === 0) continue;

    md += `### ${feature}\n\n`;
    for (const p of data.offlinePatterns) {
      md += `- **${p.pattern}** — \`${p.file}\`\n`;
    }
    md += `\n`;
  }

  // ── Sync Pipeline ───────────────────────────────────────────────────────
  if (syncPipeline.length > 0) {
    md += `## 🔄 Sync Pipeline\n\n`;
    md += `_How offline data gets synced when connectivity returns:_\n\n`;

    // Deduplicate by order
    const seen = new Set();
    for (const step of syncPipeline) {
      if (seen.has(step.order)) continue;
      seen.add(step.order);
      md += `${step.order}. **${step.description}** — \`${step.file}\`\n`;
    }
    md += `\n`;
  }

  // ── Cache Tiers ─────────────────────────────────────────────────────────
  md += `## 🏗️ Cache Tiers\n\n`;
  md += `_The app uses a three-tier cache strategy for critical data:_\n\n`;
  md += `\`\`\`\n`;
  md += `┌─────────────┐     ┌──────────────────┐     ┌──────────────┐\n`;
  md += `│  memCache    │ ──► │  AsyncStorage     │ ──► │  Supabase    │\n`;
  md += `│  (in-memory) │     │  (persistent)     │     │  (server)    │\n`;
  md += `└─────────────┘     └──────────────────┘     └──────────────┘\n`;
  md += `   Fastest              Survives restart        Source of truth\n`;
  md += `\`\`\`\n\n`;

  // List which services use each tier
  const tieredServices = [];
  for (const [feature, data] of Object.entries(features)) {
    if (data.hasMemCache && data.hasCacheFallback) {
      tieredServices.push(feature);
    }
  }

  if (tieredServices.length > 0) {
    md += `**Services using all three tiers:** ${tieredServices.join(", ")}\n\n`;
  }

  return md;
}

module.exports = { generate, name: "OFFLINE_BEHAVIOR.md" };

if (require.main === module) {
  const md = generate();
  fs.mkdirSync(path.join(projectRoot, "docs", "generated"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "docs", "generated", "OFFLINE_BEHAVIOR.md"), md);
  console.log("✅ docs/generated/OFFLINE_BEHAVIOR.md generated");
}
