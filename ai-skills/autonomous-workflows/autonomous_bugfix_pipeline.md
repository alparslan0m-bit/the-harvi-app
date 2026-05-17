# Autonomous Bugfix Pipeline: Issue Isolation, Regression Checks & Self-Healing

This document defines the automated stages, diagnostic checks, and self-healing workflows required to isolate, resolve, and verify software bugs inside the App Factory workspace.

---

## 1. Bugfix Execution Workflow

When encountering a crash, error log, or visual regression, the AI agent must run the **Self-Healing Loop**:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: Trace & Classify Error             │
        │  Analyze log trace, categorize (TypeScript, Runtime, DB)│
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: Isolate Code Scopes               │
        │  Find exact line of failure using target log markers   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │              Stage 3: Scaffold Patch                   │
        │  Deploy targeted, surgical fix without touching extra   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 4: Verification & Regression         │
        │  Run compilation check, compile asset, verify clean    │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Quality Gateways & Self-Healing Logic

If the patch fails to compile, the pipeline triggers automated self-healing procedures:

| Bug Category | Fail Condition | Self-Healing Action |
| :--- | :--- | :--- |
| **TypeScript / Type Drift** | Compilation error during `tsc --noEmit`. | Parse compiler output line markers. Inject optional chaining (`?.`) or resolve interface contracts. |
| **Database Constraint** | SQL violation constraint failure (`23505`, `42703`). | Probe candidate column structures. Inject dynamic fallback value picking arrays. |
| **Asset Path Mismatch** | Image or font file collapses into 0x0 size on view. | Validate file paths under `/assets`. Enforce absolute width/height declarations inside StyleSheets. |

---

## 3. Autonomous Verification Routine

To verify that a bug is fully resolved, the agent can write and execute an atomic test script:

```typescript
// scratch/test_bug_fix.ts
import { decryptAnswer } from "@/utils/security";

try {
  // Test XOR decryption on various formats
  const result = decryptAnswer("aGVsbG8gd29ybGQ="); // Mock base64
  console.log("Success: Bugfix verification complete. Decrypted cleanly without crash.");
} catch (err) {
  console.error("Failure: Bugfix failed to resolve exception:", err);
}
```

---

# Anti-Patterns to Avoid

*   **Shotgun Patching**: Modifying multiple files simultaneously in an attempt to resolve a single error.
    *   *Consequence*: introduces new visual bugs, makes code review complex, and breaks project compilation.
*   **Suppressing Errors via SILENT CATCH blocks**: Wrapping unstable network calls in empty `catch {}` statements without Sentry telemetry logs.
    *   *Consequence*: Suppresses crash reports, hides backend issues, and leads to unpredictable user interfaces.
