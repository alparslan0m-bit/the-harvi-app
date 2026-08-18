/**
 * Compare archgovern's graph against the legacy verify_graph output.
 *
 *   node examples/harvi/compare.js [--diff]
 *
 * Runs archgovern in-memory against the Harvi example config and compares the
 * resulting graph with the JSON emitted by the legacy `graphing/verify_graph.js`
 * engine. Exits 0 when both graphs are equivalent (same nodes, edges, flows and
 * no field drift), 1 otherwise.
 */

const fs = require("fs");
const path = require("path");

const { loadConfig } = require("../../lib/config");
const { runGovernance } = require("../../lib/run");

const LEGACY = path.resolve(__dirname, "..", "..", "..", "graphing", "architecture.json");
const CONFIG = path.join(__dirname, "archgovern.config.js");

const diffMode = process.argv.includes("--diff");

function keyOf(e) {
  return `${e.source}->${e.target}`;
}

function main() {
  const config = loadConfig(CONFIG);
  const result = runGovernance({ projectRoot: config.projectRoot, config });

  const fresh = result.architecture;
  const legacy = JSON.parse(fs.readFileSync(LEGACY, "utf8"));

  const rows = [];

  const legacyNodes = new Map(legacy.nodes.map((n) => [n.id, n]));
  const freshNodes = new Map(fresh.nodes.map((n) => [n.id, n]));

  const addedNodes = [...freshNodes.keys()].filter((id) => !legacyNodes.has(id));
  const removedNodes = [...legacyNodes.keys()].filter((id) => !freshNodes.has(id));

  const sharedNodeIds = [...legacyNodes.keys()].filter((id) => freshNodes.has(id));
  const nodeFieldDrift = [];
  for (const id of sharedNodeIds) {
    const a = legacyNodes.get(id);
    const b = freshNodes.get(id);
    for (const field of ["layer", "technology", "label", "description"]) {
      if (a[field] !== b[field]) {
        nodeFieldDrift.push({ id, field, legacy: a[field], fresh: b[field] });
      }
    }
  }

  const legacyEdges = new Map(legacy.edges.map((e) => [keyOf(e), e]));
  const freshEdges = new Map(fresh.edges.map((e) => [keyOf(e), e]));

  const addedEdges = [...freshEdges.keys()].filter((k) => !legacyEdges.has(k));
  const removedEdges = [...legacyEdges.keys()].filter((k) => !freshEdges.has(k));

  const sharedEdgeKeys = [...legacyEdges.keys()].filter((k) => freshEdges.has(k));
  const edgeFieldDrift = [];
  for (const k of sharedEdgeKeys) {
    const a = legacyEdges.get(k);
    const b = freshEdges.get(k);
    if (a.description !== b.description || a.label !== b.label) {
      edgeFieldDrift.push({
        key: k,
        legacy: { label: a.label, description: a.description },
        fresh: { label: b.label, description: b.description },
      });
    }
  }

  const legacyFlows = new Map(legacy.flows.map((f) => [f.id, f]));
  const freshFlows = new Map(fresh.flows.map((f) => [f.id, f]));
  const addedFlows = [...freshFlows.keys()].filter((id) => !legacyFlows.has(id));
  const removedFlows = [...legacyFlows.keys()].filter((id) => !freshFlows.has(id));
  const flowDrift = [...freshFlows.keys()]
    .filter(
      (id) =>
        legacyFlows.has(id) &&
        JSON.stringify(legacyFlows.get(id)) !== JSON.stringify(freshFlows.get(id)),
    )
    .map((id) => ({ id }));

  const graphMatch =
    addedNodes.length === 0 &&
    removedNodes.length === 0 &&
    nodeFieldDrift.length === 0 &&
    addedEdges.length === 0 &&
    removedEdges.length === 0 &&
    edgeFieldDrift.length === 0 &&
    addedFlows.length === 0 &&
    removedFlows.length === 0 &&
    flowDrift.length === 0;

  const box = (t) => `╔═ ${t}`;

  rows.push(box(`NODES  legacy=${legacy.nodes.length}  fresh=${fresh.nodes.length}`));
  if (addedNodes.length || removedNodes.length) {
    addedNodes.forEach((id) => rows.push(`  ➕ ${id}`));
    removedNodes.forEach((id) => rows.push(`  ❌ ${id}`));
  } else {
    rows.push("  ✅ identical node set");
  }
  if (nodeFieldDrift.length) {
    rows.push(`  ⚠️  field drift on ${nodeFieldDrift.length} shared nodes (see --diff)`);
  }

  rows.push(box(`EDGES  legacy=${legacy.edges.length}  fresh=${fresh.edges.length}`));
  if (addedEdges.length || removedEdges.length) {
    addedEdges.forEach((k) => rows.push(`  ➕ ${k}`));
    removedEdges.forEach((k) => rows.push(`  ❌ ${k}`));
  } else {
    rows.push("  ✅ identical edge set");
  }
  if (edgeFieldDrift.length) {
    rows.push(`  ⚠️  label/description drift on ${edgeFieldDrift.length} shared edges (see --diff)`);
  }

  rows.push(box(`FLOWS  legacy=${legacy.flows.length}  fresh=${fresh.flows.length}`));
  if (addedFlows.length || removedFlows.length || flowDrift.length) {
    addedFlows.forEach((id) => rows.push(`  ➕ ${id}`));
    removedFlows.forEach((id) => rows.push(`  ❌ ${id}`));
    flowDrift.forEach((f) => rows.push(`  ⚠️  content differs: ${f.id}`));
  } else {
    rows.push("  ✅ identical flow set");
  }

  if (diffMode) {
    rows.push("");
    for (const d of nodeFieldDrift) {
      rows.push(`NODE ${d.id}.${d.field}`);
      rows.push(`  legacy: ${String(d.legacy)}`);
      rows.push(`  fresh : ${String(d.fresh)}`);
    }
    for (const d of edgeFieldDrift) {
      rows.push(`EDGE ${d.key}`);
      rows.push(`  legacy: ${JSON.stringify(d.legacy)}`);
      rows.push(`  fresh : ${JSON.stringify(d.fresh)}`);
    }
  }

  rows.push("");
  rows.push(
    graphMatch
      ? "✅ GRAPHS ARE EQUIVALENT — archgovern reproduces the legacy engine's output."
      : "❌ GRAPHS DIFFER — inspect the deltas above (rerun with --diff for field-level detail).",
  );

  process.stdout.write(rows.join("\n") + "\n");
  process.exit(graphMatch ? 0 : 1);
}

main();
