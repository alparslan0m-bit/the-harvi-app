# Reusable Patterns Memory: Component Catalogs & Discovery Schemas

This document defines the schema, cataloging workflows, and discovery protocols required by AI agents to track and reuse modular widgets, hooks, and database schemas inside the App Factory OS.

---

## 1. Pattern Registration Schema

To catalog a newly created custom hook, shared UI component, or database utility, the agent must append a record conforming to this schema:

```json
{
  "patternId": "string (unique key, e.g. useColorsHook)",
  "category": "string (ui-ux | react-native | standards | database)",
  "description": "string (summary of the pattern's role)",
  "absolutePath": "file:///absolute/path/to/source",
  "usageExample": "string (markdown code snippet of how to import and use)",
  "performanceMetrics": {
    "rendersPerSec": 120,
    "memoryProfile": "minimal"
  }
}
```

---

## 2. Dynamic Pattern Discovery Workflow

To prevent code duplication, future agents must run the **Pattern Discovery Sweep** prior to writing helper functions:

```
                  ┌──────────────────────────────┐
                  │    Target Feature Request    │
                  └──────────────┬───────────────┘
                                 │
                  Does a registered pattern match the design need?
                  ├── Yes ──► Import pattern directly, avoiding new code wrappers
                  └── No  ──► Scaffold standard element, register output in memory
```

---

## 3. Pattern Cataloging Trigger Rules

An agent must dynamically register a component inside the reusable catalog when:
1.  A newly built widget is utilized across **2+ different screens**.
2.  A custom hook handles data synchronization that can be mapped to different tables.
3.  A custom database SQL function aggregates logs in a way that applies to multiple views.

---

# Anti-Patterns to Avoid

*   **Code Duplication (Wasted Work)**: Re-writing custom helper methods (e.g. date formatters or network checkers) because the agent did not scan the reusable patterns memory first.
    *   *Consequence*: Clutters the workspace, bloats code directories, and increases maintenance costs.
*   **Registration Drift**: Cataloging components without providing accurate `usageExample` strings.
    *   *Consequence*: Prevents subsequent generating agents from using the patterns correctly.
