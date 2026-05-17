# Clean Code Rules: Architecture & File Cleanliness

This document establishes standards for modularity, clean dependencies, and code patterns inside the Harvi workspace.

---

## 1. Modularization & Surgical Refactoring

To prevent files from swelling into unmaintainable, single-sheet code monoliths (often exceeding 1,000 lines), Harvi enforces a **Strict Hook-Component Division**:

```
        ┌────────────────────────────────────────────────────────┐
        │                        Screen                          │
        │  Imports Custom Hook logic & maps visual presentation │
        └───────────────┬────────────────────────┬───────────────┘
                        │                        │
        ┌───────────────▼────────┐      ┌────────▼──────────────┐
        │  Component JSX (View)  │      │  Custom Hook (Logic)  │
        │  Renders UI controls   │      │  Controls state loops │
        └────────────────────────┘      └───────────────────────┘
```

### Key Practices
*   **Decouple Screens**: Screens inside the `app/` routing directory must be thin wrappers. They invoke custom hooks, retrieve layout values, and render sub-elements.
*   **Strict Layout Isolation**: Subcomponents or cards (e.g. `StatsCard` or `TopicRow`) must reside in the component subfolder, not as inline methods inside the screen renderer file. Inline sub-render methods (e.g. `renderRow()`) cause unnecessary layout redraws and slow down the main rendering threads.

---

## 2. Dependency Hygiene (Preventing Orphans)

When editing or refactoring code:
*   **Remove Unused Imports**: Unused imports increase JS compile times and expand bundle outputs. If a variable, import statement, or function becomes unused after a refactor, delete it immediately.
*   **Do Not Mutate Unrelated Code**: When completing a task, edit only the files required to fulfill the specific goal. Do not modify formatting, comments, or logic in adjacent files that are already working correctly.

---

## 3. Writing Self-Documenting Code

Harvi prioritizes clean, self-explanatory variable naming over heavy inline commenting blocks. If you need to write comments, document **WHY** a technical decision was made, not **WHAT** the code does:

```typescript
// CORRECT: Documents architectural decision
// iOS SecureStore has a per-entry limit of 2KB. We chunk tokens transparently to avoid silent crashes on large JWTs.
const CHUNK_SIZE = 1800;

// AVOID: Explains obvious code logic
// Loop through token values and write them into the storage engine
for (let i = 0; i < chunks.length; i++) {
  await SecureStore.setItemAsync(key, chunks[i]);
}
```
---

## 4. Clean Code Guidelines

1.  **Strict Lint Compliance**: Ensure all code passes standard ESLint compile checks before proposing integrations. Unused variables, unresolved imports, or dangling brackets will result in build failure.
2.  **No Dead Code Commitments**: Never comment out large blocks of inactive code and leave them inside active files. If code is deprecated or no longer used, delete it entirely — git history can be used to recover past implementations.
