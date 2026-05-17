# Autonomous Refactor Pipeline: Modularization, Signatures & Cleanup

This document outlines the systematic, stage-based workflow required to refactor, modularize, and clean up components inside the App Factory workspace without introducing regression bugs.

---

## 1. Refactoring Execution Workflow

AI refactoring tasks must execute according to the **Surgical Modularization Loop**:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: Trace State & Dependencies         │
        │  Scan variables, local imports, and props signatures   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 2: Extract Hook Logic                 │
        │  Move business mutations to hooks under /hooks         │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │           Stage 3: Scaffold Presenters                 │
        │  Create visual children components with strict props   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 4: Orphan Elements Cleanup           │
        │  Wipe out unused imports, dead variables, and logs     │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Compatibility & Signature Quality Gates

To prevent breaking existing screen files when updating hooks or shared widgets, the pipeline enforces three rules:

*   **Rule 1 (Signature Lock)**: Never delete or rename existing parameters inside a public hook. New parameters must be declared as **optional**:
    ```typescript
    // CORRECT: Maintains compatibility for existing screens
    export function useLectures(subjectId: string, options?: { autoPrefetch?: boolean })
    ```
*   **Rule 2 (Purge Orphans)**: If your refactoring steps render any variable or import statement unused, delete it immediately.
*   **Rule 3 (Compile Check)**: The refactoring process is not complete until a clean TypeScript compilation check passes (`tsc --noEmit`).

---

## 3. Dynamic Compilation Audit

The generating agent must run a check sweep before marking refactor steps as completed:

```powershell
# Clear caches, run compilation verification
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Refactor successfully compiled without breaking signatures!"
} else {
    Write-Error "Failure: Signature mismatch detected in compilation trace!"
}
```

---

# Anti-Patterns to Avoid

*   **Premature Global Refactoring**: Rewriting stable, compiled utility code blocks to match stylistic trends when they are already working perfectly.
    *   *Consequence*: Introduces new regression bugs, breaks compilation paths, and slows down project shipping.
*   **Leaving Orphaned Imports**: Leaving trailing imports of deleted or moved components inside screen headers.
    *   *Consequence*: balloons bundle sizes, slows down hot reloads, and clutters editor symbol searches.
