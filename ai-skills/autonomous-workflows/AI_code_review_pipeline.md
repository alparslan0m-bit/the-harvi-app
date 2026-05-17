# AI Code Review Pipeline: Syntactic Linting, Architecture Gates & Score Audits

This document defines the automated review steps, static analysis checks, and quantitative quality gates required to validate generated files prior to workspace integration.

---

## 1. Code Review Workflow

Every generated or modified file must pass through the **Code Review Pipeline**:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: Static Syntax Analysis             │
        │  Verify clean TypeScript compile (tsc --noEmit)        │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: Architecture Audit                │
        │  Verify Presenters contain no internal useState state  │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 3: Theme Token Inspection            │
        │  Confirm zero static color strings or hardcoded hexes  │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 4: Quality Scoring Calculate          │
        │  Compute SS score; block integration if score is < 90  │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Review Gate Checklist

The reviewing agent must reject any commits containing the following properties:

| File Property | Review Action | Corrective Action |
| :--- | :--- | :--- |
| **`any` typings** | Reject immediately. | Declare strict TypeScript type models or interfaces. |
| **Static Color Hexes** | Reject immediately. | Dynamic import color hooks from `@/hooks/useColors`. |
| **Dangling Imports** | Request cleanup. | Run import sweeps to prune unused imports in document headers. |
| **Monolithic routing files** | Request modularization. | Extract state logic to custom hooks, presenters to components. |

---

## 3. Dynamic Compilation Verification

To ensure that the workspace is 100% stable before completing review, the agent must verify compilation via command-line:

```powershell
# Execute typescript compilation verify
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Review pipeline passed. Workspace compiles cleanly."
} else {
    Write-Error "Failure: Compilation errors detected during review!"
}
```

---

# Anti-Patterns to Avoid

*   **Bypassing Linter Alerts**: Ignoring warnings or disabling TypeScript checks to speed up code delivery.
    *   *Consequence*: Leads to silent runtime bugs, regression errors, and a fragile codebase.
*   **Approving Monolithic Views**: Allowing single files to exceed 350 lines because the interface "looks good."
    *   *Consequence*: balloons cognitive overhead, slows down Metro reloads, and prevents components from being reused.
