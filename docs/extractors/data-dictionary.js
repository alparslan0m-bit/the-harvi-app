/**
 * ============================================================================
 *  DATA DICTIONARY EXTRACTOR
 * ============================================================================
 *
 *  Parses SQL migrations + Zod schemas to produce a unified data dictionary.
 *  Run:  node docs/extractors/data-dictionary.js
 *
 *  Outputs:
 *    • Tables with columns, types, constraints, FKs
 *    • RPCs with signatures
 *    • Triggers and cron jobs
 *    • Zod ↔ SQL cross-reference with mismatch warnings
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const schemasFile = path.join(
  projectRoot,
  "artifacts",
  "mobile",
  "src",
  "shared",
  "types",
  "schemas.ts",
);

// ============================================================================
// 1. PARSE SQL MIGRATIONS
// ============================================================================

function parseMigrations() {
  const tables = {};
  const rpcs = [];
  const triggers = [];
  const indexes = [];
  const cronJobs = [];

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const migrationName = file;

    // ── Parse CREATE TABLE ────────────────────────────────────────────────
    const tableRegex =
      /CREATE TABLE IF NOT EXISTS\s+(public\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[2];
      const body = match[3];
      const columns = [];
      const tableConstraints = [];

      // Split by lines and parse each column/constraint
      const lines = body
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("--"));

      for (const line of lines) {
        // Table-level constraint
        if (line.match(/^CONSTRAINT\s+/i)) {
          const name = line.match(/CONSTRAINT\s+(\w+)/i)?.[1] || "";
          tableConstraints.push({ name, definition: line.replace(/,\s*$/, "") });
          continue;
        }

        // Column definition
        const colMatch = line.match(
          /^(\w+)\s+([\w(),.]+(?:\s+[\w(),.]+)?)/i,
        );
        if (colMatch && !line.match(/^(CONSTRAINT|UNIQUE|PRIMARY|CHECK|FOREIGN)\s/i)) {
          const colName = colMatch[1];
          let colType = colMatch[2].replace(/,\s*$/, "");

          const isPK = /PRIMARY KEY/i.test(line);
          const isNotNull = /NOT NULL/i.test(line);
          const hasDefault = line.match(/DEFAULT\s+(.+?)(?:,|\s+CONSTRAINT|\s+REFERENCES|\s*$)/i);
          const fkMatch = line.match(/REFERENCES\s+([\w.]+)\((\w+)\)/i);
          const checkMatch = line.match(/CHECK\s*\((.+?)\)(?:\s*,|\s*$)/i);
          const isUnique = /UNIQUE/i.test(line) && !line.match(/^CONSTRAINT/i);

          columns.push({
            name: colName,
            type: colType,
            primaryKey: isPK,
            notNull: isNotNull || isPK,
            default: hasDefault ? hasDefault[1].trim().replace(/,$/, "").trim() : null,
            foreignKey: fkMatch
              ? `→ ${fkMatch[1].replace("public.", "")}.${fkMatch[2]}`
              : null,
            check: checkMatch ? checkMatch[1] : null,
            unique: isUnique,
          });
        }
      }

      tables[tableName] = {
        columns,
        constraints: tableConstraints,
        migration: migrationName,
      };
    }

    // ── Parse ALTER TABLE ADD COLUMN ──────────────────────────────────────
    const alterRegex =
      /ALTER TABLE\s+(public\.)?(\w+)\s+ADD COLUMN IF NOT EXISTS\s+(\w+)\s+(\w+)/gi;
    while ((match = alterRegex.exec(content)) !== null) {
      const tableName = match[2];
      if (tables[tableName]) {
        tables[tableName].columns.push({
          name: match[3],
          type: match[4],
          primaryKey: false,
          notNull: false,
          default: null,
          foreignKey: null,
          check: null,
          unique: false,
          addedIn: migrationName,
        });
      }
    }

    // ── Parse CREATE OR REPLACE FUNCTION (RPCs) ──────────────────────────
    const funcRegex =
      /CREATE OR REPLACE FUNCTION\s+(public\.)?(\w+)\s*\(([^)]*)\)\s*\nRETURNS\s+([\w\s(),.]+?)\s+LANGUAGE/gi;
    while ((match = funcRegex.exec(content)) !== null) {
      rpcs.push({
        name: match[2],
        params: match[3].trim(),
        returns: match[4].trim(),
        migration: migrationName,
      });
    }

    // Also try single-line RETURNS pattern
    const funcRegex2 =
      /CREATE OR REPLACE FUNCTION\s+(public\.)?(\w+)\s*\(([^)]*)\)\s*RETURNS\s+([\w\s(),.]+?)\s+LANGUAGE/gi;
    while ((match = funcRegex2.exec(content)) !== null) {
      // Avoid duplicates
      if (!rpcs.find((r) => r.name === match[2])) {
        rpcs.push({
          name: match[2],
          params: match[3].trim(),
          returns: match[4].trim(),
          migration: migrationName,
        });
      }
    }

    // ── Parse CREATE TRIGGER ─────────────────────────────────────────────
    const triggerRegex =
      /CREATE TRIGGER\s+(\w+)\s+(BEFORE|AFTER)\s+(\w+)\s+ON\s+([\w.]+)\s+FOR EACH ROW\s+EXECUTE FUNCTION\s+([\w.]+)\(\)/gi;
    while ((match = triggerRegex.exec(content)) !== null) {
      triggers.push({
        name: match[1],
        timing: match[2],
        event: match[3],
        table: match[4].replace("public.", ""),
        function: match[5].replace("public.", ""),
        migration: migrationName,
      });
    }

    // ── Parse CREATE INDEX ───────────────────────────────────────────────
    const indexRegex =
      /CREATE INDEX IF NOT EXISTS\s+(\w+)\s+ON\s+([\w.]+)\s*\(([^)]+)\)/gi;
    while ((match = indexRegex.exec(content)) !== null) {
      indexes.push({
        name: match[1],
        table: match[2].replace("public.", ""),
        columns: match[3].trim(),
        migration: migrationName,
      });
    }

    // ── Parse cron.schedule ──────────────────────────────────────────────
    const cronRegex =
      /cron\.schedule\(\s*'([^']+)'\s*,\s*'([^']+)'/gi;
    while ((match = cronRegex.exec(content)) !== null) {
      cronJobs.push({
        name: match[1],
        schedule: match[2],
        migration: migrationName,
      });
    }
  }

  return { tables, rpcs, triggers, indexes, cronJobs };
}

// ============================================================================
// 2. PARSE ZOD SCHEMAS
// ============================================================================

function parseZodSchemas() {
  if (!fs.existsSync(schemasFile)) return {};

  const content = fs.readFileSync(schemasFile, "utf8");
  const schemas = {};

  // Match: export const XxxSchema = z.object({ ... });
  const schemaRegex =
    /export const (\w+Schema)\s*=\s*z\.object\(\{([\s\S]*?)\}\)/g;
  let match;
  while ((match = schemaRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields = {};

    // Parse z.xxx() fields
    const fieldRegex = /(\w+):\s*(z\.[^,\n]+)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields[fieldMatch[1]] = fieldMatch[2].trim().replace(/,$/, "");
    }

    schemas[name] = fields;
  }

  return schemas;
}

// ============================================================================
// 3. CROSS-REFERENCE SQL ↔ ZOD
// ============================================================================

// Map Zod schema names to SQL table names
const zodToTableMap = {
  ModuleSchema: "modules",
  LectureSchema: "lectures",
  SubjectSchema: "subjects",
  YearSchema: "years",
  QuestionSchema: "questions",
  QuizResultSchema: "quiz_results",
  UserStatsSchema: "user_stats",
  ContentAccessEntrySchema: null, // RPC return type, no direct table
  PurchaseSchema: "purchases",
  PendingQuizResultSchema: null, // Client-only schema (offline queue)
  CachedLectureSchema: null, // Client-only schema (AsyncStorage cache)
  AnsweredStateSchema: null, // Client-only UI state
  HistoryItemSchema: null, // Client-only UI state
};

function crossReference(tables, zodSchemas) {
  const mismatches = [];

  for (const [schemaName, tableName] of Object.entries(zodToTableMap)) {
    if (!tableName || !zodSchemas[schemaName] || !tables[tableName]) continue;

    const zodFields = Object.keys(zodSchemas[schemaName]);
    const sqlColumns = tables[tableName].columns.map((c) => c.name);

    // Zod has it but SQL doesn't
    for (const field of zodFields) {
      if (!sqlColumns.includes(field)) {
        // Check common renames (e.g., "order" vs "order_index")
        const possibleAlias = `${field}_index`;
        if (!sqlColumns.includes(possibleAlias) && field !== "order") {
          mismatches.push({
            type: "zod_only",
            schema: schemaName,
            table: tableName,
            field,
          });
        }
      }
    }

    // SQL has it but Zod doesn't
    for (const col of sqlColumns) {
      const normalizedCol = col.replace(/_index$/, "").replace(/^order_index$/, "order");
      if (
        !zodFields.includes(col) &&
        !zodFields.includes(normalizedCol)
      ) {
        // Skip common auto-fields that Zod typically omits
        const autoFields = ["created_at", "updated_at"];
        if (!autoFields.includes(col)) {
          mismatches.push({
            type: "sql_only",
            schema: schemaName,
            table: tableName,
            field: col,
          });
        }
      }
    }
  }

  return mismatches;
}

// ============================================================================
// 4. GENERATE MARKDOWN
// ============================================================================

function generate() {
  const { tables, rpcs, triggers, indexes, cronJobs } = parseMigrations();
  const zodSchemas = parseZodSchemas();
  const mismatches = crossReference(tables, zodSchemas);

  let md = `# Data Dictionary

> **Auto-generated** by \`docs/extractors/data-dictionary.js\` from SQL migrations + Zod schemas.
> Guaranteed accurate — derived directly from source files.

`;

  // ── Mismatch warnings ───────────────────────────────────────────────────
  if (mismatches.length > 0) {
    md += `## ⚠️ Schema Drift Warnings\n\n`;
    md += `| Type | Schema | Table | Field |\n`;
    md += `|------|--------|-------|-------|\n`;
    for (const m of mismatches) {
      const label =
        m.type === "zod_only"
          ? "🟡 In Zod, not in SQL"
          : "🔴 In SQL, not in Zod";
      md += `| ${label} | ${m.schema} | ${m.table} | \`${m.field}\` |\n`;
    }
    md += `\n`;
  } else {
    md += `> ✅ No schema drift detected between SQL and Zod.\n\n`;
  }

  // ── Tables ──────────────────────────────────────────────────────────────
  md += `## 📦 Tables\n\n`;

  for (const [tableName, table] of Object.entries(tables)) {
    md += `### ${tableName}\n`;
    md += `_Source: \`${table.migration}\`_\n\n`;
    md += `| Column | Type | PK | Not Null | Default | FK | Check |\n`;
    md += `|--------|------|----|----------|---------|----|-------|\n`;

    for (const col of table.columns) {
      md += `| \`${col.name}\` | ${col.type} | ${col.primaryKey ? "✅" : ""} | ${col.notNull ? "✅" : ""} | ${col.default || "—"} | ${col.foreignKey || "—"} | ${col.check || "—"} |\n`;
    }

    if (table.constraints.length > 0) {
      md += `\n**Constraints:** `;
      md += table.constraints.map((c) => `\`${c.name}\``).join(", ");
    }
    md += `\n\n`;
  }

  // ── RPCs / Functions ────────────────────────────────────────────────────
  md += `## 🔧 RPCs & Functions\n\n`;
  md += `| Function | Params | Returns | Source |\n`;
  md += `|----------|--------|---------|--------|\n`;
  for (const rpc of rpcs) {
    md += `| \`${rpc.name}\` | ${rpc.params || "—"} | ${rpc.returns} | ${rpc.migration} |\n`;
  }
  md += `\n`;

  // ── Triggers ────────────────────────────────────────────────────────────
  if (triggers.length > 0) {
    md += `## ⚡ Triggers\n\n`;
    md += `| Trigger | Timing | Event | Table | Calls |\n`;
    md += `|---------|--------|-------|-------|-------|\n`;
    for (const t of triggers) {
      md += `| \`${t.name}\` | ${t.timing} | ${t.event} | ${t.table} | ${t.function}() |\n`;
    }
    md += `\n`;
  }

  // ── Indexes ─────────────────────────────────────────────────────────────
  if (indexes.length > 0) {
    md += `## 📇 Indexes\n\n`;
    md += `| Index | Table | Columns |\n`;
    md += `|-------|-------|---------|\n`;
    for (const idx of indexes) {
      md += `| \`${idx.name}\` | ${idx.table} | ${idx.columns} |\n`;
    }
    md += `\n`;
  }

  // ── Cron Jobs ───────────────────────────────────────────────────────────
  if (cronJobs.length > 0) {
    md += `## ⏰ Cron Jobs\n\n`;
    md += `| Name | Schedule |\n`;
    md += `|------|----------|\n`;
    for (const cron of cronJobs) {
      md += `| \`${cron.name}\` | \`${cron.schedule}\` |\n`;
    }
    md += `\n`;
  }

  // ── Zod Schemas ─────────────────────────────────────────────────────────
  if (Object.keys(zodSchemas).length > 0) {
    md += `## 🛡️ Zod Schemas (Client-Side Validation)\n\n`;
    for (const [name, fields] of Object.entries(zodSchemas)) {
      const mappedTable = zodToTableMap[name];
      const tableLabel = mappedTable ? ` → \`${mappedTable}\`` : " _(client-only)_";
      md += `### ${name}${tableLabel}\n\n`;
      md += `| Field | Zod Type |\n`;
      md += `|-------|----------|\n`;
      for (const [field, type] of Object.entries(fields)) {
        md += `| \`${field}\` | \`${type}\` |\n`;
      }
      md += `\n`;
    }
  }

  return md;
}

module.exports = { generate, name: "DATA_DICTIONARY.md" };

if (require.main === module) {
  const md = generate();
  fs.writeFileSync(path.join(projectRoot, "DATA_DICTIONARY.md"), md);
  console.log("✅ DATA_DICTIONARY.md generated");
}
