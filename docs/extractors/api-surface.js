/**
 * ============================================================================
 *  API SURFACE EXTRACTOR
 * ============================================================================
 *
 *  Scans every .ts/.tsx file for Supabase calls and maps the full API surface.
 *  Run:  node docs/extractors/api-surface.js
 *
 *  Outputs:
 *    • Database queries: table, operation, file, line, query shape
 *    • RPC calls: name, file, line, params
 *    • Edge function invocations
 *    • Auth method calls
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
// 2. PARSE SUPABASE CALLS
// ============================================================================

function parseSupabaseCalls(files) {
  const dbQueries = [];
  const rpcCalls = [];
  const functionInvocations = [];
  const authCalls = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    const relPath = path
      .relative(projectRoot, file)
      .replace(/\\/g, "/");

    // ── supabase.from("table") ───────────────────────────────────────────
    const fromRegex = /supabase[\s\n]*\.from\(\s*["'](\w+)["']\s*\)/g;
    let match;
    while ((match = fromRegex.exec(content)) !== null) {
      const lineNum =
        content.substring(0, match.index).split("\n").length;
      const table = match[1];

      // Look ahead for the chained method (.select, .insert, .delete, .update, .upsert)
      const afterMatch = content.substring(match.index, match.index + 300);
      let operation = "unknown";
      let queryShape = "";

      const selectMatch = afterMatch.match(/\.select\(\s*(.*?)\s*\)/);
      const insertMatch = afterMatch.match(/\.insert\(/);
      const deleteMatch = afterMatch.match(/\.delete\(/);
      const updateMatch = afterMatch.match(/\.update\(/);
      const upsertMatch = afterMatch.match(/\.upsert\(/);

      if (selectMatch) {
        operation = "SELECT";
        queryShape = selectMatch[1] ? selectMatch[1].replace(/["']/g, "") : "*";
      } else if (insertMatch) {
        operation = "INSERT";
      } else if (deleteMatch) {
        operation = "DELETE";
      } else if (updateMatch) {
        operation = "UPDATE";
      } else if (upsertMatch) {
        operation = "UPSERT";
      }

      // Look for filters
      const eqMatch = afterMatch.match(/\.eq\(\s*["'](\w+)["']/);
      const filterInfo = eqMatch ? `.eq("${eqMatch[1]}")` : "";

      dbQueries.push({
        table,
        operation,
        file: relPath,
        line: lineNum,
        queryShape: queryShape || "—",
        filter: filterInfo,
      });
    }

    // ── supabase.rpc("name", params) ─────────────────────────────────────
    const rpcRegex = /supabase\.rpc\(\s*["'](\w+)["']\s*(?:,\s*(\{[^}]*\}))?/g;
    while ((match = rpcRegex.exec(content)) !== null) {
      const lineNum =
        content.substring(0, match.index).split("\n").length;
      rpcCalls.push({
        name: match[1],
        file: relPath,
        line: lineNum,
        params: match[2] ? match[2].trim() : "—",
      });
    }

    // ── supabase.functions.invoke("name") ────────────────────────────────
    const fnRegex =
      /supabase\.functions\.invoke\(\s*["'](\w[\w-]*)["']/g;
    while ((match = fnRegex.exec(content)) !== null) {
      const lineNum =
        content.substring(0, match.index).split("\n").length;
      functionInvocations.push({
        name: match[1],
        file: relPath,
        line: lineNum,
      });
    }

    // ── supabase.auth.* ──────────────────────────────────────────────────
    const authRegex = /supabase\.auth\.(\w+)\(/g;
    while ((match = authRegex.exec(content)) !== null) {
      const lineNum =
        content.substring(0, match.index).split("\n").length;
      authCalls.push({
        method: match[1],
        file: relPath,
        line: lineNum,
      });
    }
  }

  return { dbQueries, rpcCalls, functionInvocations, authCalls };
}

// ============================================================================
// 3. GENERATE MARKDOWN
// ============================================================================

function generate() {
  const files = walk(mobileRoot);
  const { dbQueries, rpcCalls, functionInvocations, authCalls } =
    parseSupabaseCalls(files);

  let md = `# API Surface

> **Auto-generated** by \`docs/extractors/api-surface.js\`.
> Generated at ${new Date().toISOString()}
> Every Supabase call in the codebase, mapped to file and line.

`;

  // ── Summary ─────────────────────────────────────────────────────────────
  md += `## Summary\n\n`;
  md += `| Type | Count |\n`;
  md += `|------|-------|\n`;
  md += `| Database queries | ${dbQueries.length} |\n`;
  md += `| RPC calls | ${rpcCalls.length} |\n`;
  md += `| Edge function invocations | ${functionInvocations.length} |\n`;
  md += `| Auth method calls | ${authCalls.length} |\n`;
  md += `\n`;

  // ── Database Queries (grouped by table) ─────────────────────────────────
  md += `## 🗄️ Database Queries\n\n`;

  const byTable = {};
  for (const q of dbQueries) {
    if (!byTable[q.table]) byTable[q.table] = [];
    byTable[q.table].push(q);
  }

  for (const [table, queries] of Object.entries(byTable).sort()) {
    md += `### ${table}\n\n`;
    md += `| Operation | File | Line | Columns/Shape | Filter |\n`;
    md += `|-----------|------|------|---------------|--------|\n`;
    for (const q of queries) {
      md += `| ${q.operation} | \`${q.file}\` | ${q.line} | ${q.queryShape} | ${q.filter || "—"} |\n`;
    }
    md += `\n`;
  }

  // ── RPC Calls ───────────────────────────────────────────────────────────
  if (rpcCalls.length > 0) {
    md += `## 🔧 RPC Calls\n\n`;
    md += `| RPC Name | File | Line | Params |\n`;
    md += `|----------|------|------|--------|\n`;
    for (const r of rpcCalls) {
      md += `| \`${r.name}\` | \`${r.file}\` | ${r.line} | \`${r.params}\` |\n`;
    }
    md += `\n`;
  }

  // ── Edge Function Invocations ───────────────────────────────────────────
  if (functionInvocations.length > 0) {
    md += `## ⚡ Edge Function Invocations\n\n`;
    md += `| Function | File | Line |\n`;
    md += `|----------|------|------|\n`;
    for (const f of functionInvocations) {
      md += `| \`${f.name}\` | \`${f.file}\` | ${f.line} |\n`;
    }
    md += `\n`;
  }

  // ── Auth Methods ────────────────────────────────────────────────────────
  if (authCalls.length > 0) {
    md += `## 🔐 Auth Methods\n\n`;

    // Group by method
    const byMethod = {};
    for (const a of authCalls) {
      if (!byMethod[a.method]) byMethod[a.method] = [];
      byMethod[a.method].push(a);
    }

    md += `| Method | File | Line |\n`;
    md += `|--------|------|------|\n`;
    for (const [method, calls] of Object.entries(byMethod).sort()) {
      for (const c of calls) {
        md += `| \`${method}\` | \`${c.file}\` | ${c.line} |\n`;
      }
    }
    md += `\n`;
  }

  return md;
}

module.exports = { generate, name: "API_SURFACE.md" };

if (require.main === module) {
  const md = generate();
  fs.mkdirSync(path.join(projectRoot, "docs", "generated"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "docs", "generated", "API_SURFACE.md"), md);
  console.log("✅ docs/generated/API_SURFACE.md generated");
}
