/**
 * ============================================================================
 *  HOOKS & QUERIES EXTRACTOR
 * ============================================================================
 *
 *  Scans for React Query hooks (useQuery, useMutation) and custom hooks,
 *  mapping the full reactive data flow including invalidation chains.
 *  Run:  node docs/extractors/hooks-and-queries.js
 *
 *  Outputs:
 *    • Query keys with stale times and invalidation triggers
 *    • Custom hooks with their dependencies
 *    • Invalidation chains (which action invalidates which query)
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
// 2. EXTRACT QUERY HOOKS
// ============================================================================

function extractQueryHooks(files) {
  const queries = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");

    // Find useQuery calls with queryKey
    const useQueryRegex =
      /useQuery\(\s*\{[\s\S]*?queryKey:\s*\[([^\]]+)\]/g;
    let match;
    while ((match = useQueryRegex.exec(content)) !== null) {
      const lineNum =
        content.substring(0, match.index).split("\n").length;
      const rawKey = match[1].trim();

      // Try to extract staleTime
      const afterMatch = content.substring(
        match.index,
        match.index + 2000,
      );
      const staleMatch = afterMatch.match(
        /staleTime:\s*(\d+(?:\s*\*\s*\d+)*)/,
      );
      const gcMatch = afterMatch.match(
        /gcTime:\s*(\d+(?:\s*\*\s*\d+)*)/,
      );

      // Find the enclosing exported function name
      const beforeMatch = content.substring(0, match.index);
      const funcMatch = beforeMatch.match(
        /export\s+function\s+(\w+)/g,
      );
      const enclosingFunc = funcMatch
        ? funcMatch[funcMatch.length - 1].match(
            /export\s+function\s+(\w+)/,
          )?.[1]
        : null;

      queries.push({
        queryKey: rawKey,
        file: relPath,
        line: lineNum,
        hook: enclosingFunc || path.basename(file, path.extname(file)),
        staleTime: staleMatch ? staleMatch[1] : "default",
        gcTime: gcMatch ? gcMatch[1] : "default",
      });
    }
  }

  return queries;
}

// ============================================================================
// 3. EXTRACT INVALIDATIONS
// ============================================================================

function extractInvalidations(files) {
  const invalidations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");

    // queryClient.invalidateQueries({ queryKey: ["xxx", ...] })
    const invalidateRegex =
      /queryClient\.invalidateQueries\(\s*\{\s*queryKey:\s*\[\s*["'](\w+)["'][\s\S]*?\]/g;
    let match;
    while ((match = invalidateRegex.exec(content)) !== null) {
      const lineNum =
        content.substring(0, match.index).split("\n").length;
      const queryKey = match[1];

      // Find enclosing exported function (ignores internal helpers like timeoutPromise)
      const beforeMatch = content.substring(0, match.index);
      const funcMatch = beforeMatch.match(
        /export\s+(?:function|const)\s+(\w+)/g,
      );
      const enclosingFunc = funcMatch
        ? funcMatch[funcMatch.length - 1].match(
            /(?:function|const)\s+(\w+)/,
          )?.[1]
        : null;

      invalidations.push({
        queryKey,
        file: relPath,
        line: lineNum,
        triggeredBy: enclosingFunc || path.basename(file, path.extname(file)),
      });
    }

    // queryClient.setQueriesData({ queryKey: ["xxx", ...] }, ...)
    const setDataRegex =
      /queryClient\.setQueriesData\(\s*\{\s*queryKey:\s*\[\s*["'](\w+)["'][\s\S]*?\]/g;
    while ((match = setDataRegex.exec(content)) !== null) {
      const lineNum =
        content.substring(0, match.index).split("\n").length;
      invalidations.push({
        queryKey: match[1],
        file: relPath,
        line: lineNum,
        triggeredBy: "setQueriesData (optimistic)",
        type: "optimistic",
      });
    }

    // queryClient.removeQueries
    const removeRegex =
      /queryClient\.removeQueries\(\s*\{\s*queryKey:\s*\[\s*["'](\w+)["'][\s\S]*?\]/g;
    while ((match = removeRegex.exec(content)) !== null) {
      const lineNum =
        content.substring(0, match.index).split("\n").length;
      invalidations.push({
        queryKey: match[1],
        file: relPath,
        line: lineNum,
        triggeredBy: "removeQueries (cache clear)",
        type: "remove",
      });
    }
  }

  return invalidations;
}

// ============================================================================
// 4. EXTRACT CUSTOM HOOKS
// ============================================================================

function extractCustomHooks(files) {
  const hooks = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");

    // export function useXxx(params)
    // Use non-greedy match until the closing parenthesis before the function body bracket
    const hookRegex = /export\s+(?:function|const)\s+(use\w+)\s*(?:=\s*(?:\([^)]*\)\s*=>\s*)?)?\(([\s\S]*?)\)\s*(?::\s*[^{=]+)?\s*(?:=>\s*)?\{/g;
    let match;
    while ((match = hookRegex.exec(content)) !== null) {
      const hookName = match[1];
      const params = match[2].replace(/\s+/g, " ").trim() || "—";
      const lineNum =
        content.substring(0, match.index).split("\n").length;

      // Detect what this hook uses internally
      const deps = [];
      // Find the function body (rough: from this point to the next export or EOF)
      const funcBody = content.substring(
        match.index,
        content.indexOf("\nexport ", match.index + 1) !== -1
          ? content.indexOf("\nexport ", match.index + 1)
          : content.length,
      );

      // Detect store usage
      if (funcBody.includes("useAuth")) deps.push("authStore");
      if (funcBody.includes("useTheme")) deps.push("themeStore");
      if (funcBody.includes("usePurchase")) deps.push("purchaseStore");
      if (funcBody.includes("useSync")) deps.push("syncStore");
      if (funcBody.includes("useCacheStore")) deps.push("cacheStore");

      // Detect React Query usage
      if (funcBody.includes("useQuery")) deps.push("React Query");
      if (funcBody.includes("useQueryClient") || funcBody.includes("queryClient"))
        deps.push("queryClient");

      // Detect service usage
      const serviceRegex = /(?:import.*from.*|require\().*\/(\w+Service)/g;
      let svcMatch;
      while ((svcMatch = serviceRegex.exec(funcBody)) !== null) {
        deps.push(svcMatch[1]);
      }

      // Detect AsyncStorage
      if (funcBody.includes("AsyncStorage")) deps.push("AsyncStorage");

      // Detect Supabase
      if (funcBody.includes("supabase.")) deps.push("supabase");

      // Detect return type (rough heuristic)
      const returnMatch = funcBody.match(/return\s+\{([^}]+)\}/);
      const returnType = returnMatch
        ? returnMatch[1]
            .split(",")
            .map((s) => s.trim().split(":")[0].trim())
            .filter(Boolean)
            .join(", ")
        : "—";

      hooks.push({
        name: hookName,
        params: params || "—",
        file: relPath,
        line: lineNum,
        deps,
        returns: returnType,
      });
    }
  }

  return hooks;
}

// ============================================================================
// 5. GENERATE MARKDOWN
// ============================================================================

function generate() {
  const files = walk(mobileRoot);
  const queries = extractQueryHooks(files);
  const invalidations = extractInvalidations(files);
  const hooks = extractCustomHooks(files);

  let md = `# Hooks & Queries

> **Auto-generated** by \`docs/extractors/hooks-and-queries.js\`.
> Generated at ${new Date().toISOString()}
> Maps the full React Query key space and custom hook dependency tree.

`;

  // ── Query Keys ──────────────────────────────────────────────────────────
  md += `## 🔑 Query Keys\n\n`;
  md += `| Key | Hook | File | Stale Time |\n`;
  md += `|-----|------|------|------------|\n`;
  for (const q of queries) {
    md += `| \`[${q.queryKey}]\` | \`${q.hook}()\` | \`${q.file}\` | ${q.staleTime} |\n`;
  }
  md += `\n`;

  // ── Invalidation Chains ─────────────────────────────────────────────────
  md += `## 🔄 Invalidation Chains\n\n`;
  md += `_When X happens, which query caches get busted?_\n\n`;

  // Group by triggeredBy
  const byTrigger = {};
  for (const inv of invalidations) {
    const key = `${inv.triggeredBy} (${path.basename(inv.file)})`;
    if (!byTrigger[key]) byTrigger[key] = [];
    byTrigger[key].push(inv);
  }

  md += `| Trigger | Invalidates | Type | File:Line |\n`;
  md += `|---------|------------|------|----------|\n`;
  for (const [trigger, invs] of Object.entries(byTrigger).sort()) {
    for (const inv of invs) {
      const type = inv.type || "invalidate";
      md += `| ${trigger} | \`${inv.queryKey}\` | ${type} | \`${inv.file}:${inv.line}\` |\n`;
    }
  }
  md += `\n`;

  // ── Per-key invalidation summary ────────────────────────────────────────
  md += `## 📊 Per-Key Invalidation Summary\n\n`;
  const byKey = {};
  for (const inv of invalidations) {
    if (!byKey[inv.queryKey]) byKey[inv.queryKey] = [];
    byKey[inv.queryKey].push(inv.triggeredBy);
  }

  md += `| Query Key | Invalidated By |\n`;
  md += `|-----------|---------------|\n`;
  for (const [key, triggers] of Object.entries(byKey).sort()) {
    md += `| \`${key}\` | ${[...new Set(triggers)].join(", ")} |\n`;
  }
  md += `\n`;

  // ── Custom Hooks ────────────────────────────────────────────────────────
  md += `## 🪝 Custom Hooks\n\n`;
  md += `| Hook | Params | File | Depends On | Returns |\n`;
  md += `|------|--------|------|------------|--------|\n`;
  for (const h of hooks) {
    const deps = h.deps.length > 0 ? h.deps.join(", ") : "—";
    md += `| \`${h.name}()\` | ${h.params || "—"} | \`${h.file}\` | ${deps} | ${h.returns} |\n`;
  }
  md += `\n`;

  return md;
}

module.exports = { generate, name: "HOOKS_AND_QUERIES.md" };

if (require.main === module) {
  const md = generate();
  fs.mkdirSync(path.join(projectRoot, "docs", "generated"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "docs", "generated", "HOOKS_AND_QUERIES.md"), md);
  console.log("✅ docs/generated/HOOKS_AND_QUERIES.md generated");
}
