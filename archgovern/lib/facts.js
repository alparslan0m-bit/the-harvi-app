/**
 * Pluggable derived facts for archgovern.
 *
 * Facts are structurally-extracted lists (SQLite tables, Supabase tables/RPCs,
 * edge functions, env vars, ...) that get overlaid onto node descriptions so
 * those descriptions can never drift from the code. Each fact definition in
 * config.derivedFacts has:
 *
 *   {
 *     name: "sqliteTables",                 // fact key
 *     applyTo: ["sqlite"],                  // node ids to re-describe
 *     files: [ { type: "file", path },      // inputs: file | dir | dirNames
 *              { type: "dir", path, filter, recursive } ]
 *     extract: (entries) => [...],          // entries: [{path, content?}]
 *     description: (data, node) => string | null   // null/undefined -> keep node
 *   }
 *
 * If `extract` is omitted, a built-in regex extractor runs `regex` against each
 * entry's content and dedups matches.
 */

const fs = require("fs");
const path = require("path");
const { collectInputs } = require("./fs-utils");

// Default extractor: deduplicated capture-group matches of `regex`.
function extractByRegex(entries, regex) {
  const items = [];
  for (const entry of entries) {
    if (!entry.content) continue;
    const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
    let m;
    while ((m = re.exec(entry.content)) !== null) {
      const value = m[1] !== undefined ? m[1] : m[0];
      if (!items.includes(value)) items.push(value);
    }
  }
  return items;
}

// Compute the raw facts for every derivedFacts entry.
function deriveNodeFacts({ config, projectRoot }) {
  const facts = {};
  const walkOpts = {
    extensions: config.fileExtensions,
    skipDirs: config.skipDirs,
    projectRoot,
  };

  for (const factDef of config.derivedFacts || []) {
    const entries = [];
    for (const input of factDef.files || []) {
      entries.push(...collectInputs(input, walkOpts));
    }
    const items =
      typeof factDef.extract === "function"
        ? factDef.extract(entries)
        : factDef.regex
          ? extractByRegex(entries, factDef.regex)
          : [];
    facts[factDef.name] = {
      items,
      applyTo: factDef.applyTo,
      description: factDef.description,
    };
  }
  return facts;
}

// Overlay deterministic derived descriptions onto verified nodes. If a fact's
// description function returns null/undefined (e.g. no data), the node keeps
// its existing (curated) description as a fallback.
function applyDerivedDescriptions(nodes, facts) {
  return nodes.map((n) => {
    for (const fact of Object.values(facts)) {
      if (!fact.applyTo.includes(n.id)) continue;
      const text = fact.description ? fact.description(fact.items, n) : null;
      if (typeof text === "string" && text.length > 0) {
        return { ...n, description: text };
      }
    }
    return n;
  });
}

module.exports = { deriveNodeFacts, applyDerivedDescriptions, extractByRegex };
