# Architecture Evolution Engine: Scale Phases, Triggers & Migration

This document defines the architectural growth roadmap, structural refactoring triggers, and database schema migration protocols of the Harvi AI App Factory OS.

---

## 1. Codebase Scale Phases

An application's architecture must evolve dynamically to match user scales. Premature scaling destroys startup agility, while late scaling causes catastrophic system downtime:

```
    PHASE 1: MVP (0 - 1,000 Users)
    ├── Target: Rapid feature validation
    └── Focus: Local SQLite cache, single transactional DB pools
    
    PHASE 2: Scale (1,000 - 50,000 Users)
    ├── Target: Performance optimization & analytics
    └── Focus: Supavisor pool integration, dual-layer Map warming
    
    PHASE 3: Enterprise (50,000+ Users)
    ├── Target: High concurrency & high availability
    └── Focus: Read replicas, background worker task queues, CDNs
```

---

## 2. Refactoring Triggers (Quantitative Check)

AI refactoring tasks must be triggered dynamically based on these exact structural metrics:

*   **Trigger 1 (File Volume)**: If a visual layout file (`.tsx`) exceeds **350 lines of code**, it must be modularized into subcomponents under `/components`.
*   **Trigger 2 (Hook Duplication)**: If state logic is duplicated across **3 distinct views**, extract it into a global shared hook under `/hooks`.
*   **Trigger 3 (Database Call Saturation)**: If a view executes **3+ separate network API fetches** on mount, collapse queries into a single Supabase PG Stored Procedure (RPC) payload call.

---

## 3. Database Schema Migration Playbook

When updating database structures (e.g. renaming columns) while maintaining active mobile clients, the AI must follow this **Zero-Downtime Migration Playbook**:

```
                  ┌──────────────────────────────┐
                  │   Phase 1: DB Field Addition │
                  │ Add new column, keep old one │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │    Phase 2: Sync Triggers    │
                  │ Dual-write to old & new cols │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │    Phase 3: Deploy Client    │
                  │ Deploy app picking new col   │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │   Phase 4: Deprecate Old     │
                  │ Clean old column after 30d   │
                  └──────────────────────────────┘
```

---

# Anti-Patterns to Avoid

*   **The Big Bang Migration**: Dropping or renaming a database column in production without deploying dual-write sync triggers first.
    *   *Consequence*: Instantly crashes legacy client installations in the wild, locking users out and destroying reviews.
*   **Over-Refactoring Legacy Code**: Rewriting stable, compiled utility code blocks that are working perfectly because of stylistic deviations.
    *   *Consequence*: Saturation of QA cycles, introduces new hidden regression bugs, and halts project shipping velocity.
*   **Monolithic DB Queries**: Fetching massive relational joint data maps (e.g. `subjects` join `lectures` join `user_progress`) over basic client queries without server-side RPC scaling.
    *   *Consequence*: Saturation of Postgres connection slots, high memory loads on the client, and connection lockups under high concurrency.
