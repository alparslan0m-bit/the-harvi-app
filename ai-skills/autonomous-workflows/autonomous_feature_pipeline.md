# Autonomous Feature Pipeline: Schema Integration & Hook Bindings

This document outlines the systematic, stage-based workflow required to inject, connect, and export new features into the App Factory codebase.

---

## 1. Feature Lifecycle Injection Workflow

When adding a feature, the AI agent must implement layers from the database up to the UI presentational layer in the following execution order:

```
        ┌────────────────────────────────────────────────────────┐
        │             Stage 1: DB Schema Provisioning            │
        │  Deploy SQL tables, indexes, and RLS policies on PG    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 2: Types & API Handlers               │
        │  Define TS interface models & Supabase network queries │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 3: State Hook Controller              │
        │  Wrap queries in React Query, define cache policies    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 4: Presenter & Navigation             │
        │  Mount screen visual cards, hook up routes in router   │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Validation Quality Gates

At each stage, the AI must verify system state before proceeding:

| Execution Stage | Quality Check | Corrective Action on Failure |
| :--- | :--- | :--- |
| **Stage 1 (DB Schema)** | SQL table exists, and RLS policies restrict anonymous access. | Re-evaluate database connection. Inject secure Postgres RLS schema. |
| **Stage 2 (API Handlers)**| Typescript matches candidates picking arrays without any leaks. | Re-run dynamic column mapping scanner. Resolve model typings. |
| **Stage 3 (State Hook)** | Mutation pre-flight checks online network status cleanly. | Wrap query hooks inside NetInfo observer triggers. |

---

## 3. Orchestration Example: Registering Components

When a new sub-widget is created (e.g. `WidgetCard.tsx`), the pipeline must automatically update the parent folder's barrel export file (`index.ts`) to make imports clean:

```typescript
// components/widgets/index.ts
export * from "./WidgetCard";
export * from "./WidgetHeader";
export * from "./WidgetFooter";
```

---

# Anti-Patterns to Avoid

*   **UI-First Injection**: Designing beautiful presenter cards and tabs before building the database schema and custom hooks.
    *   *Consequence*: Leads to structural mismatches, missing props, and double-work cycles when mapping database fields.
*   **Neglecting RLS Policies**: Injecting Supabase tables without activating strict Row-Level Security checks.
    *   *Consequence*: Critical security vulnerability allowing any user to read or write database records using the public client.
