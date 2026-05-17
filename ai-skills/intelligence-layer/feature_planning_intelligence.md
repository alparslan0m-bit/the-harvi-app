# Feature Planning Intelligence: Decompositions, Reuse & Modularization

This document defines the cognitive workflows and boundaries mapping required by AI agents to plan, decompose, and scaffold new features inside the App Factory workspace.

---

## 1. Feature Decomposition Workflow

To ensure code modularity and prevent developer drift, every new feature request must be systematically decomposed using the **4-Tier Scaffolding Hierarchy**:

```
        ┌────────────────────────────────────────────────────────┐
        │                 Tier 1: Data Contract                  │
        │  Define explicit TypeScript Interfaces & DB schemas    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │               Tier 2: Hook Controller                  │
        │  Define state mutations & caching rules inside hook    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                 Tier 3: UI Presenter                   │
        │  Build isolated visual components with strict props    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                    Tier 4: Routing                     │
        │  Add minimal layout screens inside app/ directory       │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Quantitative Complexity Estimator

Before writing a single line of code, the AI agent must compute the **Feature Complexity Index (FCI)**:

$$\text{FCI} = \text{Data Tables} \times 1.5 + \text{Native APIs} \times 2.0 + \text{Shared Hooks} \times 1.2$$

*   **FCI < 3 (Low Complexity)**: Build in a single phased developer turn.
*   **FCI 3 - 6 (Medium Complexity)**: Create standalone sub-folder structures, exporting widgets through barrel files.
*   **FCI > 6 (High Complexity)**: Must be broken down into separate sub-features to avoid creating bloated files.

---

## 3. Reusable Infrastructure Extraction Heuristic

To prevent duplicating code blocks when scaling features, the AI must run the **Infrastructure Extraction Scan** before creating new helpers:

```
                  ┌──────────────────────────────┐
                  │    Scan New Helper Need      │
                  └──────────────┬───────────────┘
                                 │
                  Is the logic duplicated in 2+ components?
                  ├── No  ──► Keep inline within custom hook
                  │
                  └── Yes ──► Does it require React rendering hooks?
                              ├── Yes ──► Create in hooks/shared/use[Name].ts
                              └── No  ──► Create in utils/shared/[name].ts
```

---

# Anti-Patterns to Avoid

*   **Speculative Feature Abstraction**: Extracting global utility files for code blocks that are only used in a single view.
    *   *Consequence*: balloons cognitive overhead, clutters directory trees, and increases package sizes.
*   **Direct View Mutations**: Allowing visual presenter components to trigger raw API mutations directly inside button click handlers.
    *   *Consequence*: Breaks component testing isolation, bypasses central caching structures, and causes state-drift bugs.
*   **Monolithic Route Files**: Declaring complete database queries, styling matrices, and sub-widgets inside a single screen router file (e.g. `bookmarks.tsx`).
    *   *Consequence*: Slow hot-reloads, rapid compilation crashes, and zero reuse capability. Screen files must serve strictly as routing navigations.
