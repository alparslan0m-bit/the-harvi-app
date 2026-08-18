/**
 * Curated-content lint for archgovern: fail the build if hand-authored prose
 * references terms the code no longer has. This is the guard that makes stale
 * prose impossible to commit silently.
 */

function scanCuratedContent({ nodes, edges, flows, bans }) {
  const violations = [];
  const check = (kind, target, text) => {
    if (!text) return;
    for (const ban of bans || []) {
      if (text.includes(ban.phrase)) {
        violations.push({
          kind,
          target,
          phrase: ban.phrase,
          reason: ban.reason,
        });
      }
    }
  };

  nodes.forEach((n) => check("node.description", n.id, n.description));
  edges.forEach((e) => {
    check("edge.description", `${e.source}->${e.target}`, e.description);
    check("edge.label", `${e.source}->${e.target}`, e.label);
  });
  flows.forEach((f) => {
    check("flow.name", f.id, f.name);
    check("flow.description", f.id, f.description);
    (f.steps || []).forEach((s) => check("flow.step", `${f.id}:${s.order}`, s.action));
  });

  return violations;
}

module.exports = { scanCuratedContent };
