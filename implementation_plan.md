# Governance Engine: verify_graph.js Rewrite

Turn [verify_graph.js](file:///c:/Users/METRO/harvi%20gamed/graphing/verify_graph.js) from a passive checker into the **single source of truth** — it scans the codebase, produces the data files, generates `architecture.json` + `architecture.html`, then verifies itself.

## Current Problems

1. **NodeMapping has stale paths** — e.g. `artifacts/mobile/app/(main)/module` and `artifacts/mobile/app/(main)/subject` don't exist. The real paths are under `(tabs)/(learn)/`.
2. **Edge discovery is incomplete** — semantic rules are hardcoded heuristics that fall behind the code.
3. **Flow from data → verify is backwards** — today, data files are hand-written, then verify checks them. If data files drift, the test fails but gives no corrective action.
4. **No governance output** — the verify script exits 0/1 but doesn't produce the corrected data or a governance report.

## Proposed Architecture

```
verify_graph.js (single script)
  │
  ├─ Phase 1: SCAN   — walk the codebase, discover every node + every import edge
  ├─ Phase 2: ENRICH — resolve external deps, supabase externals, add metadata (type, layer, technology, description) from existing data files
  ├─ Phase 3: WRITE  — write verified nodes.js, edges.js to graphing/data/
  ├─ Phase 4: BUILD  — run generate.js logic inline (produce architecture.json + architecture.html)
  └─ Phase 5: AUDIT  — compare what was generated vs what existed, print governance report, exit 1 if diff
```

## Proposed Changes

### [MODIFY] [verify_graph.js](file:///c:/Users/METRO/harvi%20gamed/graphing/verify_graph.js)

Complete rewrite. The new script will:

#### Phase 1 — Codebase Scan (zero assumptions)
- Walk `artifacts/mobile/` recursively for `.ts`/`.tsx` files
- **Auto-discover nodeMapping** by reading the *current* directory structure instead of hardcoding paths. Uses the existing `nodeMapping` dictionary as a reference for node IDs, but validates every path exists on disk. Paths that don't exist → flagged as **STALE** and removed.
- Parse every file's `import`/`require` statements and resolve them to node IDs
- Track which files belong to which node (file→node map)

#### Phase 2 — Edge Discovery (evidence-based)
- For every file, for every import statement, resolve the import to a target node
- Each edge has **evidence**: the exact file and line number where the import occurs
- External deps (revenuecat, netinfo, etc.) are discovered from actual `import` statements, not assumed
- Supabase externals (`supabase_auth`, `supabase_db`, `supabase_functions`) are inferred from API usage patterns in code (e.g., `supabase.auth.*` → `supabase_auth`, `supabase.from(` → `supabase_db`, `supabase.functions.invoke` → `supabase_functions`)
- **No edge is added without code evidence**

#### Phase 3 — Write Data
- Generate `data/nodes.js` from discovered nodes (preserving existing metadata like labels, descriptions, technology from the current file when the node still exists)
- Generate `data/edges.js` from discovered edges (preserving existing metadata like labels, descriptions, edge types from the current file when the edge still exists)
- **Flows are preserved as-is** — flows are conceptual/narrative and aren't derivable from imports. But the script validates that every node referenced in a flow actually exists.

#### Phase 4 — Build Outputs
- Produce `architecture.json` by combining nodes + edges + flows (same as current `generate.js`)
- Produce `architecture.html` from template (same as current `generate.js`)

#### Phase 5 — Governance Audit Report
- Compare the newly generated data against what was previously on disk
- Print a governance report:
  - ✅ Verified nodes (exist in code AND in graph)
  - ❌ Stale nodes removed (were in graph but files deleted)
  - ➕ New nodes added (found in code but missing from graph)
  - ✅ Verified edges (import exists in code AND in graph)
  - ❌ Phantom edges removed (graph claimed them but code doesn't have the import)
  - ➕ New edges added (code imports them but graph was missing them)
  - ⚠️ Flow validation (all flow step nodes exist)
- Exit 0 if no changes were needed (data was already accurate)
- Exit 1 if changes were made (data was corrected — CI can enforce this)

### Key Design Decisions

1. **NodeMapping stays as a curated dictionary** — node IDs and their file patterns are defined explicitly (we want `learn_feature`, not auto-generated slugs). But every path is validated against disk.
2. **Edge metadata is preserved** — the script round-trips existing edge descriptions/labels/types. Only the source→target pairs are verified from code.
3. **Flows are validated but not generated** — flows reference node IDs so we check they exist, but flow steps are narrative and can't be derived from static analysis.
4. **The script IS the pipeline** — after this change, you run `node verify_graph.js` and it produces everything. `generate.js` becomes optional/redundant.

> [!IMPORTANT]
> The existing `nodeMapping` has incorrect paths:
> - `"artifacts/mobile/app/(main)/module"` → should be `"artifacts/mobile/app/(main)/(tabs)/(learn)/module"`
> - `"artifacts/mobile/app/(main)/subject"` → should be `"artifacts/mobile/app/(main)/(tabs)/(learn)/subject"`
> - `"artifacts/mobile/app/login.tsx"` → should be `"artifacts/mobile/app/(auth)/login.tsx"`
>
> These will be fixed in the rewrite.

> [!NOTE]
> The `"Flow triggers"` edges in `edges.js` (lines 882–1166) are special — they don't have `id` or `type` fields and represent flow visualization arrows. The new script will preserve these but validate that both source and target nodes exist.

## Verification Plan

### Automated Tests
```bash
# Run the governance engine
node graphing/verify_graph.js

# It should exit 0 on a clean run (no drift)
# On first run after rewrite, it may exit 1 if it corrects stale paths
# Second run should always exit 0 (idempotent)
```

### Manual Verification
- Open `graphing/architecture.html` in browser and spot-check the graph
- Verify the governance report in console output lists every node and edge with evidence
