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

// Words that routinely precede `(` in prose but are not real symbols. Kept
// conservative: when in doubt, DON'T filter — a false positive is only an
// advisory warning, never a build failure.
const PROSE_WORDS = new Set(
  (
    "is are am be been being was were do does did done has have had having " +
    "can could shall should will would may might must need needs needed " +
    "the a an and or but so if when while then else for to of in on at by " +
    "with without from into onto up down over under off out about as no yes " +
    "it its this that these those which who whom what why how not only just " +
    "also too very much many some any all each every both neither either " +
    "after before during until since because although though unless using " +
    "use used shows show showing render renders rendering call calls calling " +
    "invoke invokes invoking return returns returning e.g eg etc example ex"
  ).split(/\s+/),
);

/**
 * Advisory flow-symbol check: for each flow step, flag code-like identifiers
 * written as `name(` in the step action that do not appear in any file
 * belonging to the step's node. This catches hand-authored flow prose that
 * references a renamed/deleted function or component.
 *
 * Precision rules (to avoid prose false positives):
 *   • member accesses are skipped — `supabase.auth.signUp(` is a property call,
 *     not a symbol defined in the node's files
 *   • only CODE-LIKE identifiers are checked: CamelCase (`BackButton`) or
 *     snake_case (`enqueue_quiz`) or identifiers containing digits — plain
 *     English words like `item(` / `palette(` are ignored
 * Advisory only — never affects the exit code.
 */
function scanFlowSymbols({ flows, nodeToFiles, allNodeIds, readFile }) {
  const warnings = [];

  const identifiersByNode = new Map();
  const symbolPattern = /[A-Za-z_$][A-Za-z0-9_$]*/g;

  const isCodeLike = (sym) => /[A-Z]/.test(sym) || /[0-9_]/.test(sym);

  const collectIdentifiers = (nodeId) => {
    if (identifiersByNode.has(nodeId)) return identifiersByNode.get(nodeId);
    const files = nodeToFiles.get(nodeId) || [];
    const identifiers = new Set();
    for (const file of files) {
      let content;
      try {
        content = readFile(file);
      } catch (_) {
        continue;
      }
      let m;
      while ((m = symbolPattern.exec(content)) !== null) identifiers.add(m[0]);
    }
    identifiersByNode.set(nodeId, identifiers);
    return identifiers;
  };

  for (const flow of flows || []) {
    for (const step of flow.steps || []) {
      if (!allNodeIds.has(step.node)) continue; // missing nodes handled elsewhere
      const identifiers = collectIdentifiers(step.node);
      if (identifiers.size === 0) continue; // external/remote node, nothing to check

      const refPattern = /[A-Za-z_$][A-Za-z0-9_$]*\s*\(/g;
      let m;
      while ((m = refPattern.exec(step.action || "")) !== null) {
        const start = m.index;
        const symbol = m[0].replace(/\s*\($/, "");
        // Skip member accesses: `x.foo(` — foo is a property, not a local symbol.
        const before = step.action.slice(Math.max(0, start - 2), start);
        if (before.endsWith(".") || before.endsWith("?.")) continue;
        if (!isCodeLike(symbol)) continue;
        if (PROSE_WORDS.has(symbol.toLowerCase())) continue;
        if (!identifiers.has(symbol)) {
          warnings.push({
            flowId: flow.id,
            stepOrder: step.order,
            node: step.node,
            symbol,
            action: step.action,
          });
        }
      }
    }
  }

  return warnings;
}

module.exports = { scanCuratedContent, scanFlowSymbols };
