# Past Mistakes Memory: Crash Profiles & Regression Prevention

This document defines the schema, logging structures, and lookup rules required by AI agents to track, recall, and prevent past engineering failures and type mismatches inside the App Factory workspace.

---

## 1. Failure Record Schema

To log a newly resolved bug, compilation crash, or deployment failure, the agent must append a record conforming to this schema:

```json
{
  "failureId": "string (unique key, e.g. secureStoreOverflow)",
  "errorLogTrace": "string (raw compiler trace or crash logs)",
  "causeCategory": "string (TypesScript | Database | OS-Constraint | Bundle)",
  "resolutionApplied": "string (surgical fix details)",
  "preventativeRules": "array of strings (explicit guidelines to prevent recurring)"
}
```

---

## 2. Dynamic Failure Audits Loop

When debugging a workspace error, the agent must execute the **Failure Matcher Loop**:

```
                  ┌──────────────────────────────┐
                  │    Encounter Workspace Bug   │
                  └──────────────┬───────────────┘
                                 │
                  Does an existing log match the target trace?
                  ├── Yes ──► Apply resolution instantly, bypassing diagnostics
                  └── No  ──► Execute standard isolation tree, log new failure details
```

---

## 3. Historic Safeguards Integration

Prior to running compilation or packaging scripts, the AI agent must scan the failure memory database, ensuring that none of the registered failure patterns (such as unchunked SecureStore writes or unmemoized ScrollViews) have been introduced in recent changes.

---

# Anti-Patterns to Avoid

*   **Forgetting Historical Lessons**: Resolving a bug without documenting it in the mistakes database.
    *   *Consequence*: Subsequent generating agents will repeat the exact same architectural mistakes during new features releases.
*   **Vague Failure Records**: Logging crashes without documenting the raw `errorLogTrace` or specific line number markers.
    *   *Consequence*: Makes lookup matches inaccurate and blocks automated resolution routing.
