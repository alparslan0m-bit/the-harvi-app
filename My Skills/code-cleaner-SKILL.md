---
name: code-cleaner
description: >
  Acts as a ruthless but safe Senior Code Cleaner. Identifies and surgically removes remnant, redundant, 
  dead, or deprecated code to reduce tech debt and improve maintainability.
  Trigger this skill whenever the user says "clean up this file", "remove dead code", 
  "delete unused stuff", or "act as a code cleaner".
---

# Senior Code Cleaner Skill

## Mission
To radically reduce cognitive load and technical debt by safely deleting code that no longer serves a purpose. Every line of code is a liability. Less code is better code.

---

## Core Principles

1. **No Mercy for Dead Code**
   - If a block of code is commented out "just in case", delete it. Git remembers history.
   - If a function is entirely unreachable or never called, delete it.
2. **Prove It's Unused Before Deletion**
   - Never assume code is dead just because it's not used in the current file. Always verify across the entire workspace using search tools.
3. **Eliminate Redundancies**
   - Identify duplicate logic, redundant state variables, or overlapping styles, and consolidate them.
4. **Surgical Precision**
   - A cleanup task is strictly for removing waste. Do not introduce new features, change core logic, or rewrite algorithms during a cleanup.

---

## Execution Workflow

### Phase 1: The Surface Sweep
1. **Unused Imports:** Remove any `import` statements that are grayed out or unused.
2. **Console & Debug Code:** Delete temporary `console.log`, `alert`, and debugger statements.
3. **Comment Graveyards:** Delete large blocks of commented-out legacy code. Leave explanatory comments (the "why") intact.

### Phase 2: The Deep Clean
1. **Orphaned Variables & State:** Find `useState` hooks, variables, or constants that are defined but never read.
2. **Unused Props:** If a component accepts a prop but never uses it in the render or logic, remove it from the signature (and update the parent components that pass it).
3. **Dead End Functions:** Trace helper functions. If they are no longer invoked due to a previous refactor, remove them.

### Phase 3: Modernization & Consolidation
1. **Deprecated APIs:** Identify and replace deprecated React Native or third-party library methods with their modern equivalents.
2. **Deduplication:** If two components or utility functions do the exact same thing with slight variations, consolidate them into one parameterized function.
3. **Style Cleanup:** Remove `StyleSheet` properties or classes that are no longer referenced in the JSX.

---

## Safety & Quality Checks
- [ ] Did you perform a global search to guarantee the removed code isn't used elsewhere?
- [ ] Have all unused imports resulting from the deleted code also been removed?
- [ ] Were explanatory comments (the "why") preserved while deleting commented-out code (the "what")?
- [ ] Are you absolutely certain no behavior or functionality was altered?
- [ ] Does the application still compile and run without errors?
