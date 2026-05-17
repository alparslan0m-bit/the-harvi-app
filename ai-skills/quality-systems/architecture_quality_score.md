# Architecture Quality Score: Structural Formulas & Acceptance Grids

This document defines the mathematical scoring matrices, structural checklists, and strict acceptance criteria used to audit code architecture inside the App Factory OS.

---

## 1. Architectural Quality Formula

Prior to merging any feature branch, the AI agent must compute the **Architectural Quality Score (AQS)** using the following equation:

$$\text{AQS} = 100 - (\text{Hex Colors} \times 10) - (\text{any types} \times 15) - (\text{Inline States} \times 15) - (\text{Monolithic Files} \times 20)$$

*   **AQS >= 90**: Pass. Component structure is approved.
*   **AQS < 90**: Fail. The changes must undergo structural refactoring.

---

## 2. Structural Quality Grid

The reviewing agent must audit all components against these strict criteria:

| Metric Check | Target Standard | Penalty Value | Corrective Action |
| :--- | :--- | :--- | :--- |
| **Type Integrity** | 100% strict TypeScript types; no utilization of `any`. | -15 per occurrence | Define explicit TypeScript interface models. |
| **Theme Alignment** | No hardcoded color strings (hex/HSL). | -10 per occurrence | Dynamic import from `@/hooks/useColors`. |
| **State Modularity** | Presenter components contain zero business logic. | -15 per occurrence | Move state operations to custom hooks. |
| **File Length** | Visual layout files under 350 lines. | -20 per occurrence | Modularize views into smaller files under components. |

---

## 3. High-Quality Architecture Checklist

*   **Clean Export Barrels**: Confirm that all new components are exported cleanly through their parent folder's barrel `index.ts` files.
*   **Safe Optional Typings**: Verify that all optional references contain dynamic chaining operators (`?.`) or safe default fallbacks.
*   **No Unbounded SecureStore Writes**: Confirm that secure token data maps are chunked safely using the chunking adapter.

---

# Anti-Patterns to Avoid

*   **Bypassing Type compilation checks**: Disabling TypeScript rules or suppressing linter warnings to force compilations.
    *   *Consequence*: introduces silent runtime null bugs and breaks project consistency.
*   **Unmemoized Visual Renderers**: Exporting global state providers with unmemoized values.
    *   *Consequence*: triggers complete re-renders of the child views, dropping frame rates.
