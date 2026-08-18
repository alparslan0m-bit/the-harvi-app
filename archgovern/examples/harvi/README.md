# Harvi example — porting the legacy engine to archgovern

This folder proves archgovern is a drop-in replacement for the bespoke
`graphing/verify_graph.js` engine that the Harvi repo originally used.

- `archgovern.config.js` — the entire legacy engine expressed as **config only**
  (node mapping, externals, remotes, implicit/remote edges, derived facts for
  SQLite/Supabase, content bans, layers). Zero code changes.
- `data/` — seeded copies of the legacy curated metadata (`nodes.js`,
  `edges.js`, `flows.js`) so the round-trip preserves hand-written descriptions.
- `compare.js` — runs archgovern in-memory and diffs its graph against the
  legacy engine's `graphing/architecture.json`.

```bash
# Regenerate this example's docs/JSON/HTML (does NOT touch the repo's own
# ARCHITECTURE.md — outputs are redirected to this folder).
node ../../bin/archgovern.js archgovern.config.js

# Prove archgovern reproduces the legacy engine exactly.
node compare.js
```

Result:

```
╔═ NODES  legacy=38  fresh=38    ✅ identical node set
╔═ EDGES  legacy=189 fresh=189   ✅ identical edge set
╔═ FLOWS  legacy=21  fresh=21    ✅ identical flow set
✅ GRAPHS ARE EQUIVALENT — archgovern reproduces the legacy engine's output.
```

### Keeping this example fresh

The repo's `graphing/data/*.js` is the source of truth for curated prose. To
re-sync the seed copy after those change:

```bash
cp ../graphing/data/nodes.js examples/harvi/data/
cp ../graphing/data/edges.js examples/harvi/data/
cp ../graphing/data/flows.js examples/harvi/data/
node ../../bin/archgovern.js examples/harvi/archgovern.config.js
node examples/harvi/compare.js
```
