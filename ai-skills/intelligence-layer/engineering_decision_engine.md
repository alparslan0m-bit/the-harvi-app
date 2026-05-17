# Engineering Decision Engine: Tradeoff Matrices & Caching Heuristics

This document serves as the primary tradeoff comparison brain and selection engine of the Harvi AI App Factory OS. It defines the formal matrices and heuristics required by AI agents and developers to evaluate structural, performance, and API options.

---

## 1. Architectural Selection Matrix

When selecting state, storage, or execution structures, the AI must evaluate candidates against the following matrix:

| Architectural Option | Boot Speed (Latency) | Memory Overhead | Network Utilization | Best Suited For |
| :--- | :--- | :--- | :--- | :--- |
| **RAM Cache Map** | Instant (< 1ms) | Minimal (< 500KB) | Zero | Low-frequency, global configs, themes. |
| **Disk AsyncStorage** | Low (5-20ms) | Moderate (Disk-bound) | Zero | Offline persistence, user progress backups. |
| **Supabase Client API** | High (50-300ms) | Low | High | Realtime sync, transactional checkouts. |
| **SecureStore (iOS/Android)**| Low (10-30ms) | Minimal | Zero | Encypted auth tokens, access credentials. |

---

## 2. Dynamic Tradeoff Frameworks

### A. Memory Allocations vs. Network Latency
*   **The Dilemma**: Storing raw data grids (e.g. 500 medical quiz questions with answer options) locally in RAM speeds up views but balloons memory profiles, leading to native device terminations.
*   **The Resolution Formula**:
    $$\text{Target Cache Location} = \begin{cases} \text{RAM Map} & \text{if } \text{Size} < 100\text{KB} \\ \text{AsyncStorage} & \text{if } 100\text{KB} \le \text{Size} < 2\text{MB} \\ \text{Supabase API} & \text{if } \text{Size} \ge 2\text{MB} \end{cases}$$

### B. Database SQL Triggers vs. Serverless Background Queues
*   **The Dilemma**: Running calculations (e.g., aggregating course completion levels and sending email reports) inside synchronous PostgreSQL triggers slows database writes.
*   **The Decision Loop**:
    ```
    Is the calculation critical to the immediate SQL transaction (e.g., payment validation)?
    ├── Yes ──► Enforce inline PostgreSQL Trigger / RLS Constraint
    └── No  ──► Offload to asynchronous background Edge Queue (using pg_net HTTP triggers)
    ```

---

## 3. Caching Selection Heuristics (Decision Tree)

Future AI agents must utilize the following decision structure when resolving query caches:

```
                              [ Incoming Data Request ]
                                          │
                        Is the device online? (NetInfo Check)
                        ├── No  ──► Return stale AsyncStorage Cache / RAM Map
                        │
                        └── Yes ──► Has the StaleTime expired? (TanStack query check)
                                    ├── No  ──► Serve instant cached RAM Map
                                    └── Yes ──► Execute background Supabase API fetch
                                                ├── Success ──► Write to Disk & RAM, return state
                                                └── Failure ──► Fallback to stale AsyncStorage
```

---

# Anti-Patterns to Avoid

*   **Optimistic Memory Bloat**: Keeping massive arrays of unmodified historical data resident in global React Context states.
    *   *Consequence*: Spikes rendering times, starves device memory pools, and triggers silent app unmounts on legacy hardware.
*   **Unthrottled Network Retries**: Retrying failed network requests indefinitely without exponential backoff timings.
    *   *Consequence*: Exhausts server connections slots, drains user device batteries, and crashes client network sockets.
*   **Encrypted Storage Overload**: Writing unchunked raw JSON data strings exceeding 2KB into native iOS SecureStore keys.
    *   *Consequence*: Triggers silent runtime exceptions during write cycles, locking users out of authenticated workspaces.
