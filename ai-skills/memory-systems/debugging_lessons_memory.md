# Debugging Lessons Memory: Diagnostic Registries & Self-Healing Lookups

This document defines the diagnostic schemas, logs registries, and self-healing search protocols required to capture and catalog debugging outcomes inside the App Factory workspace.

---

## 1. Debugging Lesson Schema

To catalog a resolved native build crash, Metro hot-reload lockup, or layout shift, the agent must append a record conforming to this schema:

```json
{
  "debugLessonId": "string (unique key, e.g. metroCacheLockup)",
  "rawCrashTrace": "string (command-line printout or error log)",
  "isolationRoutineApplied": "string (steps taken to pinpoint source)",
  "surgicalFixApplied": "string (exact code change made)",
  "validationScriptPath": "file:///path/to/verification/script"
}
```

---

## 2. Dynamic Debugging Lookup Workflow

When a workspace compilation crash occurs, the AI agent must run the **Dynamic Diagnostic Search**:

```
                  ┌──────────────────────────────┐
                  │   Encounter Compiler Crash   │
                  └──────────────┬───────────────┘
                                 │
                  Does a memory log match the raw crash trace?
                  ├── Yes ──► Apply recorded surgical fix instantly, skipping diagnostics
                  └── No  ──► Execute full isolation tree, catalog outcome in memory
```

---

## 3. Native Build Isolation Rules

*   **iOS Build Failures**: When native archive packaging fails, clear the EAS caching registers and execute `pod install` within the platform directory.
*   **Metro Lockups**: When the packager locks up during active updates, run cache-clearing scripts (`npx expo start --clear`) before restarting local dev environments.

---

# Anti-Patterns to Avoid

*   **Vague Debug Logs**: Logging crash resolutions without capturing the raw compiler trace.
    *   *Consequence*: Makes lookup matches inaccurate and blocks automated resolution routing.
*   **Shotgun Debugging**: Making arbitrary code edits across multiple files in hopes of fixing an error.
    *   *Consequence*: balloons Git diffs, introduces new bugs, and breaks compiling paths.
