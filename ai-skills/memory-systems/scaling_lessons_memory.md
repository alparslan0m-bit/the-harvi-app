# Scaling Lessons Memory: Query Profiles & Pooling Heuristics

This document defines the metrics schemas, optimization registers, and transaction pooling guidelines required to log and scale high-concurrency database queries inside the App Factory workspace.

---

## 1. Scaling Lessons Log Schema

To log a newly implemented database index, pool adjustment, or rendering optimization, the agent must append a record conforming to this schema:

```json
{
  "scalingId": "string (unique key, e.g. compositeIndexUserProgress)",
  "targetTable": "string (name of DB table)",
  "appliedOptimization": "string (e.g. composite SQL index creation)",
  "queryLatencyBeforeInMs": 350,
  "queryLatencyAfterInMs": 15,
  "poolingRoutingUsed": "string (transaction | session | none)"
}
```

---

## 2. Dynamic Performance Pre-warming Loop

When the application boots or a high-traffic screen is mounted, the client must use the **Pre-warming Heuristics** recorded in memory to pull data efficiently:

```
                  ┌──────────────────────────────┐
                  │    Mount High-Traffic View   │
                  └──────────────┬───────────────┘
                                 │
                  Is the view's query cached in memory?
                  ├── Yes ──► Serve cached RAM Map instantly
                  └── No  ──► Query transaction pool (Port 6543), pre-warm memory
```

---

## 3. High-Concurrency Scaling Guidelines

*   **Database Pools Priority**: Direct all high-frequency read and write operations to transaction mode (`port 6543`) to prevent session socket starvation.
*   **Active Composite Indexing**: Enforce multi-column SQL indexes for tables exceeding 10,000 records to keep query execution times under 50ms.

---

# Anti-Patterns to Avoid

*   **Routing Writes through Session Poolers**: Running high-volume data writes directly through session mode (`port 5432`).
    *   *Consequence*: Triggers pool timeouts and starves server threads.
*   **Uncached High-Frequency Queries**: Querying the remote database directly on every screen layout mount without a local caching layer.
    *   *Consequence*: Wastes cellular data, slows UI rendering, and increases database hosting costs.
