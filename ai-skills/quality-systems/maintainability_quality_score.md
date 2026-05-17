# Maintainability Quality Score: Clean Code & TypeScript Verifications

This document defines the mathematical scoring matrices, clean-code guidelines, and compile-safety checklists used to audit maintainability parameters inside the App Factory workspace.

---

## 1. Maintainability Quality Formula

Every newly modified component or hook must compute its **Maintainability Quality Score (MQS)**:

$$\text{MQS} = 100 - (\text{Orphan Imports} \times 10) - (\text{any usages} \times 15) - (\text{Missing Comments} \times 10)$$

*   **MQS >= 90**: Approved. Code is modular and maintainable.
*   **MQS < 90**: Failed. Component requires cleanup.

---

## 2. Code Maintainability Grid

The review agent must verify that files conform to these standards:

| Maintainability Check | Target Standard | Penalty Value | Corrective Action |
| :--- | :--- | :--- | :--- |
| **Import Cleanliness** | Unused imports and dead variables are fully purged. | -10 per orphan | Run import sweeps to prune unused imports in document headers. |
| **Type Integrity** | Component imports strict TypeScript types; no 'any'. | -15 per occurrence | Define explicit TypeScript interface models. |
| **Comment Blocks** | Complex hooks declare architectural comments explaining role. | -10 if missing | Inject JSDoc summary blocks to document hooks. |
| **Signature Safety** | Public functions maintain backward compatible parameters. | -20 if broken | Declare new parameters as optional. |

---

## 3. High-Quality Code Safeguards

*   **TypeScript Compile**: The workspace must compile cleanly (`tsc --noEmit`) without error exit codes.
*   **Decoupled Modules**: Visual presenters must contain zero business logic; move state updates to hooks.

---

# Anti-Patterns to Avoid

*   **Silently Swallowing Exceptions**: Wrapping unstable network calls in empty `catch {}` statements without Sentry telemetry logs.
    *   *Consequence*: Suppresses crash reports, hides backend issues, and leads to unpredictable user interfaces.
*   **Inline Styling Clutter**: Mixing inline styles (`style={{ padding: 12 }}`) with standard StyleSheet layouts.
    *   *Consequence*: Slows down layout calculations, blocks visual memoization gates, and decreases code readability.
