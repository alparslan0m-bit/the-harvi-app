# Autonomous Scaling Pipeline: Indexing, Pools & Load Preflights

This document outlines the systematic workflows required to analyze query latency, optimize connection pools, and pre-warm local cache systems inside the App Factory workspace.

---

## 1. Scaling Verification Workflow

To transition a feature from Low-Scale to High-Scale, the AI agent must run the **Performance Optimization Pipeline**:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: SQL Index Provisioning             │
        │  Analyze queries, generate multi-column composite index │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: Connection Pool Routing           │
        │  Route high-frequency calls to Supavisor Port 6543     │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 3: Multi-Tier Caching                │
        │  Implement RAM Map pre-warming & AsyncStorage syncs    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 4: Verification & Benchmarks          │
        │  Verify queries latency is < 50ms inside simulator     │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Quality Gateways

Scaling updates must satisfy three performance metrics:

*   **Metric 1 (Query Speed)**: All primary queries (e.g. fetching quiz lists) must execute in **under 50ms** when cached, and under 250ms when pulling from the remote API.
*   **Metric 2 (Index Alignment)**: Tables containing over 10,000 records must declare composite indexes matching common search filters:
    ```sql
    -- Example: Composite index on active user progress lookup
    CREATE INDEX IF NOT EXISTS idx_user_lecture ON user_progress(user_id, lecture_id);
    ```
*   **Metric 3 (Zero Pool Starvation)**: The client must route transactional calls through Supavisor pooling servers (`port 6543`) rather than basic session clients, preventing DB connection exhaustion.

---

## 3. Autonomous Performance Audit Script

AI agents can verify query latency trends using the following profiling template:

```typescript
// scratch/profile_queries.ts
import { supabase } from "@/lib/supabase";

async function runProfile() {
  const start = performance.now();
  
  // Benchmark primary progress query
  const { data, error } = await supabase
    .from("user_progress")
    .select("id, lecture_id, completed")
    .limit(100);

  const duration = performance.now() - start;
  console.log(`Profile: Query executed in ${duration.toFixed(2)}ms`);
  
  if (duration > 250) {
    console.warn("Warning: Query exceeds target latency threshold of 250ms!");
  }
}

runProfile();
```

---

# Anti-Patterns to Avoid

*   **Creating Redundant Indexes**: Adding SQL index tags to tables with fewer than 100 rows.
    *   *Consequence*: balloons Postgres memory overhead and slows down row insert/write speeds.
*   **Routing Writes through Session Poolers**: Executing high-frequency data writes directly through session mode (`port 5432`).
    *   *Consequence*: triggers pool connection timeouts and starves server resource threads.
