# Architecture Memory System: Experience Serialization & Update Schemas

This document defines the experience serialization schemas, historical tracking models, and runtime memory update rules of the Harvi AI App Factory OS. It enables generating agents to record, recall, and accumulate technical wisdom across engineering sessions.

---

## 1. Architectural Experience Schema

To log new lessons dynamically, the AI agent must record experiences using the following **JSON Metadata Schema**:

```json
{
  "$schema": "https://harvi.ai/schemas/memory/architecture.json",
  "sessionId": "UUIDv4-string",
  "timestamp": "ISO-8601-datetime",
  "componentAffected": "string (e.g. app/tabs/_layout.tsx)",
  "problemEncountered": "string (description of bug or scaling limit)",
  "technicalReason": "string (e.g. iOS SecureStore 2KB limitation)",
  "resolutionApplied": "string (description of the code fix)",
  "regressionTestCmd": "string (validation command command line)",
  "qualityScoreCard": {
    "typescriptCompiled": true,
    "themeContrastPassed": true,
    "latencyInMs": 15
  }
}
```

---

## 2. Dynamic Experience Logging Workflow

When a bug is fixed or a scaling limit is resolved, the agent must execute the **Memory Accumulation Loop**:

```
        ┌────────────────────────────────────────────────────────┐
        │             Stage 1: Read Active Memory                │
        │  Scan existing files under /memory-systems/            │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: Format JSON Metadata              │
        │  Populate the Experience Schema with current details   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 3: Append & Interconnect             │
        │  Append to historical records block; save memory file  │
        └────────────────────────────────────────────────────────┘
```

---

## 3. Heuristics for Experience Recall

Before starting any feature generation or refactoring task, the AI agent must check the memory database to prevent repeating past mistakes:

```
                  ┌──────────────────────────────┐
                  │    Initiate Task Ingestion   │
                  └──────────────┬───────────────┘
                                 │
                  Does a memory log match the target component?
                  ├── Yes ──► Read resolution details, inject historical safeguards
                  └── No  ──► Query general coding standards, execute fresh design
```

---

# Anti-Patterns to Avoid

*   **Losing Historical Context**: Overwriting old memory records instead of appending them in chronological order.
    *   *Consequence*: erases the localized experience "brain" of the workspace, leading to repeated architectural errors.
*   **Vague Memory Descriptions**: Logging vague statements (e.g. "fixed routing bug") without documenting the technical root cause.
    *   *Consequence*: Makes records useless for future generating agents needing context on specific errors.
