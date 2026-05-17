# Feature Generation Engine: Database Mappings, Hook Bindings & Presenters

This document defines the deterministic stages, SQL schema mappings, custom hooks creation rules, and presenter bindings required by AI agents to construct modular, database-connected features.

---

## 1. Feature Generation Workflow

Feature construction must progress sequentially through the **4-Tier Scaffolding Stages**:

```
        ┌────────────────────────────────────────────────────────┐
        │              Stage 1: SQL Schema Setup                 │
        │  Provision Postgres tables, composite indexes, and RLS │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 2: Types & API Handlers               │
        │  Define TS interfaces and write Supabase client queries│
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 3: Query Hook Controller              │
        │  Wrap queries in TanStack Query; define preflight cache│
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │           Stage 4: Presenters & Barrels                │
        │  Mount visual lists, configure barrels index files    │
        └────────────────────────────────────────────────────────┘
```

---

## 2. API Schema Matching & Verification

*   **Dynamic Column Probing**: When fetching dynamic data grids, the generated API handlers must utilize dynamic mapping arrays to resolve candidate columns, preventing crashes during schema migrations:
    ```typescript
    const TITLE_CANDIDATES = ["title", "headline", "name", "subject_title"];
    ```
*   **Active RLS Policies**: Every generated SQL table must contain a policy securing read and write operations.
*   **Strict Return Type Declarations**: All network request functions must declare explicit types:
    ```typescript
    export async function fetchUserProgress(userId: string): Promise<UserProgressRecord[]>
    ```

---

## 3. Dynamic Feature Compilation Check

AI agents can verify that a newly generated feature compiles without errors by executing this test script:

```typescript
// scratch/test_feature_build.ts
import { fetchUserProgress } from "@/api/progress";

async function verifyFeature() {
  try {
    const data = await fetchUserProgress("test-user-id");
    console.log("Success: Feature API compiled cleanly. Returned data:", data);
  } catch (err) {
    console.error("Failure: Feature API check failed:", err);
  }
}

verifyFeature();
```

---

# Anti-Patterns to Avoid

*   **Bypassing Query Controller Hooks**: Accessing database clients inside visual Presenters instead of routing operations through state controllers.
    *   *Consequence*: Prevents caching, slows rendering speeds, and clutters component modularity.
*   **Neglecting Barrel Registrations**: Forgetting to update the root `index.ts` files inside feature components.
    *   *Consequence*: Clutters imports inside page router screens, increasing code clutter.
