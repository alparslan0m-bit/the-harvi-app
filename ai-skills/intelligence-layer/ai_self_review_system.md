# AI Self-Review System: Critiques, Code Smells & Scalability Scores

This document acts as the master self-critique brain and quantitative code reviewer of the Harvi AI App Factory OS. It defines the formal review checklists, code smell detection matrices, and quality score cards that generated scripts must pass before completion.

---

## 1. Code Smell Detection Matrix

Generators must continuously audit outputs against the following code smell indicators:

| Code Smell | Detection Criteria | Architectural Penalty | Corrective Action |
| :--- | :--- | :--- | :--- |
| **State Bleed** | `useState` declared inside visual presentational folders. | Visual lag, dynamic redraw loops, unpolished interfaces. | Move state declarations to hooks under `/hooks`. |
| **Implicit Escapes** | Utilization of the `any` keyword or missing optional chaining (`?.`). | Silent runtime null crashes, breaks type-safety compiles. | Enforce strict TypeScript types and safe null guards. |
| **Dangling Imports** | Unused package or file imports left in document headers. | Balloons compile size, slows hot-reloads Metro packaging. | Execute import sweeps, deleting unused files instantly. |
| **Static Color Hexes** | Hardcoded color strings (e.g. `#fff`) inside stylesheets. | Breaks multi-theming warmth (`light`, `dark`, `pink`). | Enforce dynamic styling imports from `@/hooks/useColors`. |

---

## 2. Dynamic Scalability Scorecard

Before checking off a task, the AI agent must compute the **Scalability Score (SS)** for its changes:

$$\text{SS} = 100 - (\text{Hex Colors} \times 10) - (\text{any types} \times 15) - (\text{Inline States} \times 10) - (\text{Bare Imports} \times 5)$$

*   **SS >= 90**: Pass. Proceed to verification packaging.
*   **SS < 90**: Fail. The code must undergo self-correction refactoring.

---

## 3. Autonomous Code Review Loop

The generating agent must run this check checklist before delivery:

```
        ┌────────────────────────────────────────────────────────┐
        │                 Step 1: Check Typings                  │
        │  Verify zero 'any' keywords & strict optional safety   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                  Step 2: Check Colors                  │
        │  Confirm 100% theme support (no static hex strings)    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                 Step 3: Check Orphans                  │
        │  Confirm zero unused imports & dead variable traces    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                  Step 4: Check Files                   │
        │  Ensure Presenters are separated from Hooks states     │
        └────────────────────────────────────────────────────────┘
```

---

# Anti-Patterns to Avoid

*   **Silently Swallowing Compile Alerts**: Overriding linter warnings or TypeScript configurations to force compilations.
    *   *Consequence*: Serious downstream regressions, invisible state crashes, and rapid codebase degradation.
*   **Inline Styling Clutter**: Mixing inline styles (`style={{ padding: 12 }}`) with standard StyleSheet layouts.
    *   *Consequence*: Slows down layout calculations, blocks visual memoization gates, and decreases code readability.
*   **Redundant Global Variables**: Declaring variables outside the component scope to persist states.
    *   *Consequence*: Shared states among active users leading to cross-session data leaks, race-conditions, and erratic visual rendering bugs.
