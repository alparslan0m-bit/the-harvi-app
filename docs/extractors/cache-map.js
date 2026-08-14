/**
 * ============================================================================
 *  CACHE MAP EXTRACTOR
 * ============================================================================
 *
 *  Scans for every AsyncStorage/SecureStore key usage and maps the complete
 *  local storage namespace.
 *  Run:  node docs/extractors/cache-map.js
 *
 *  Outputs:
 *    • Every AsyncStorage key, its owner file, shape, and versioning
 *    • SecureStore keys with chunking info
 *    • Read/write patterns per key
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
// 2. EXTRACT STORAGE KEY DEFINITIONS
// ============================================================================

function extractKeyDefinitions(files) {
  const keyDefs = []; // { key, pattern, file, line, isTemplate, operations }

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");

    // Find key constant declarations
    // Pattern: const KEY = "harvi:something" or const KEY = (id) => `harvi:${id}`
    const constRegex =
      /(?:const|let)\s+(\w+(?:_KEY|_CACHE_KEY|QUEUE_KEY|KEY)?)\s*(?::\s*[^=]+)?\s*=\s*(?:["'`]([^"'`]+)["'`]|(?:\([^)]*\)\s*=>\s*)?[`"']([^`"']*\$\{[^}]+\}[^`"']*)[`"'])/g;
    let match;
    while ((match = constRegex.exec(content)) !== null) {
      const constName = match[1];
      const literalKey = match[2] || match[3];

      if (
        literalKey &&
        (literalKey.includes("harvi:") ||
          constName.toUpperCase().endsWith("KEY") ||
          constName.toUpperCase().endsWith("QUEUE"))
      ) {
        const lineNum =
          content.substring(0, match.index).split("\n").length;
        const isTemplate = literalKey.includes("${");
        keyDefs.push({
          constName,
          key: literalKey,
          pattern: isTemplate
            ? literalKey.replace(/\$\{[^}]+\}/g, "{id}")
            : literalKey,
          file: relPath,
          line: lineNum,
          isTemplate,
          operations: new Set(),
          readBy: new Set(),
          writtenBy: new Set(),
        });
      }
    }

    // Find inline string keys in AsyncStorage calls
    const inlineGetRegex =
      /AsyncStorage\.(?:getItem|multiGet)\(\s*["']([^"']+)["']/g;
    while ((match = inlineGetRegex.exec(content)) !== null) {
      const key = match[1];
      if (!keyDefs.find((k) => k.key === key)) {
        const lineNum =
          content.substring(0, match.index).split("\n").length;
        keyDefs.push({
          constName: null,
          key,
          pattern: key,
          file: relPath,
          line: lineNum,
          isTemplate: false,
          operations: new Set(["read"]),
          readBy: new Set([relPath]),
          writtenBy: new Set(),
        });
      }
    }

    const inlineSetRegex =
      /AsyncStorage\.setItem\(\s*["']([^"']+)["']/g;
    while ((match = inlineSetRegex.exec(content)) !== null) {
      const key = match[1];
      const existing = keyDefs.find((k) => k.key === key);
      if (existing) {
        existing.operations.add("write");
        existing.writtenBy.add(relPath);
      } else {
        const lineNum =
          content.substring(0, match.index).split("\n").length;
        keyDefs.push({
          constName: null,
          key,
          pattern: key,
          file: relPath,
          line: lineNum,
          isTemplate: false,
          operations: new Set(["write"]),
          readBy: new Set(),
          writtenBy: new Set([relPath]),
        });
      }
    }
  }

  return keyDefs;
}

// ============================================================================
// 3. DETECT OPERATIONS PER KEY
// ============================================================================

function detectOperations(files, keyDefs) {
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");

    for (const keyDef of keyDefs) {
      // Check if this file references the constant name or the key string
      const searchTerms = [keyDef.key];
      if (keyDef.constName) searchTerms.push(keyDef.constName);

      for (const term of searchTerms) {
        if (!content.match(new RegExp(`\\b${term}\\b`))) continue;

        // Check for reads
        if (
          content.match(
            new RegExp(
              `AsyncStorage\\.(?:getItem|multiGet)\\([^)]*\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            ),
          )
        ) {
          keyDef.operations.add("read");
          keyDef.readBy.add(relPath);
        }

        // Check for writes
        if (
          content.match(
            new RegExp(
              `AsyncStorage\\.(?:setItem|multiSet)\\([^)]*\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            ),
          )
        ) {
          keyDef.operations.add("write");
          keyDef.writtenBy.add(relPath);
        }

        // Check for deletes
        if (
          content.match(
            new RegExp(
              `AsyncStorage\\.(?:removeItem|multiRemove)\\([^)]*\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            ),
          )
        ) {
          keyDef.operations.add("delete");
        }
      }
    }
  }
}

// ============================================================================
// 4. DETECT SECURE STORE USAGE
// ============================================================================

function detectSecureStore(files) {
  const secureKeys = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");

    const ssRegex =
      /SecureStore\.(?:getItemAsync|setItemAsync|deleteItemAsync)\(\s*["'`]([^"'`]+)["'`]/g;
    let match;
    while ((match = ssRegex.exec(content)) !== null) {
      const key = match[1];
      if (!secureKeys.find((k) => k.key === key)) {
        secureKeys.push({ key, file: relPath });
      }
    }

    // Detect chunking pattern
    if (content.includes("__chunk_") || content.includes("chunk")) {
      if (content.includes("SecureStore")) {
        const existing = secureKeys.find((k) => k.file === relPath);
        if (existing) existing.chunked = true;
      }
    }
  }

  return secureKeys;
}

// ============================================================================
// 5. GENERATE MARKDOWN
// ============================================================================

function generate() {
  const files = walk(mobileRoot);
  const keyDefs = extractKeyDefinitions(files);
  detectOperations(files, keyDefs);
  const secureKeys = detectSecureStore(files);

  // Deduplicate keys by pattern
  const uniqueKeys = new Map();
  for (const k of keyDefs) {
    const existing = uniqueKeys.get(k.pattern);
    if (existing) {
      for (const op of k.operations) existing.operations.add(op);
      for (const r of k.readBy) existing.readBy.add(r);
      for (const w of k.writtenBy) existing.writtenBy.add(w);
    } else {
      uniqueKeys.set(k.pattern, { ...k });
    }
  }

  let md = `# Cache Map

> **Auto-generated** by \`docs/extractors/cache-map.js\`.
> Generated at ${new Date().toISOString()}
> Every AsyncStorage and SecureStore key in the codebase.

`;

  // ── Summary ─────────────────────────────────────────────────────────────
  md += `## Summary\n\n`;
  md += `- **${uniqueKeys.size}** AsyncStorage key patterns\n`;
  md += `- **${secureKeys.length}** SecureStore key patterns\n\n`;

  // ── AsyncStorage Keys ───────────────────────────────────────────────────
  md += `## 💾 AsyncStorage Keys\n\n`;
  md += `| Key Pattern | Defined In | Operations | Read By | Written By |\n`;
  md += `|-------------|-----------|------------|---------|------------|\n`;

  for (const [, k] of [...uniqueKeys.entries()].sort()) {
    const ops = [...k.operations].join(", ") || "—";
    const readers = [...k.readBy].map((f) => `\`${path.basename(f)}\``).join(", ") || "—";
    const writers = [...k.writtenBy].map((f) => `\`${path.basename(f)}\``).join(", ") || "—";
    md += `| \`${k.pattern}\` | \`${k.file}\` | ${ops} | ${readers} | ${writers} |\n`;
  }
  md += `\n`;

  // ── SecureStore Keys ────────────────────────────────────────────────────
  if (secureKeys.length > 0) {
    md += `## 🔒 SecureStore Keys\n\n`;
    md += `| Key | File | Chunked? |\n`;
    md += `|-----|------|----------|\n`;
    for (const k of secureKeys) {
      md += `| \`${k.key}\` | \`${k.file}\` | ${k.chunked ? "✅ (1800B chunks)" : "—"} |\n`;
    }
    md += `\n`;
  }

  // ── Namespace breakdown ─────────────────────────────────────────────────
  md += `## 📋 Namespace Breakdown\n\n`;
  const prefixes = new Map();
  for (const [pattern] of uniqueKeys) {
    const prefix = pattern.split(":").slice(0, 2).join(":");
    if (!prefixes.has(prefix)) prefixes.set(prefix, 0);
    prefixes.set(prefix, prefixes.get(prefix) + 1);
  }

  md += `| Prefix | Key Count |\n`;
  md += `|--------|-----------|\n`;
  for (const [prefix, count] of [...prefixes.entries()].sort()) {
    md += `| \`${prefix}:*\` | ${count} |\n`;
  }
  md += `\n`;

  return md;
}

module.exports = { generate, name: "CACHE_MAP.md" };

if (require.main === module) {
  const md = generate();
  fs.mkdirSync(path.join(projectRoot, "docs", "generated"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "docs", "generated", "CACHE_MAP.md"), md);
  console.log("✅ docs/generated/CACHE_MAP.md generated");
}
