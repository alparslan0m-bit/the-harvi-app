# Scaling to 100k Users: Connection Pooling, Indexing & Cache Hierarchies

This document defines the backend scalability protocols, database performance configurations, and API optimization patterns of the App Factory architecture.

---

## 1. Connection Pooling with Supavisor

When scaling to 100,000+ active users, the primary bottleneck is database connection depletion. PostgreSQL spawns a separate OS process for *every* connection, consuming heavy memory. If thousands of mobile devices connect directly to PostgreSQL, the database will exhaust its file descriptors and lock up.

To prevent this, the API gateway routes database queries through **Supavisor (Supabase's transactional connection pooler)**:

### Connection Pool Configuration Rules
*   **Edge Functions & Serverless API Routes**: Must *always* connect to the database via **Port 6543 (Transaction Mode)**. This pooler terminates and recycles connections in milliseconds, allowing 100 database connections to serve 10,000 concurrent serverless executions:
    ```
    # Transaction Pooler Connection URL (Port 6543)
    postgres://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require&supavisor_session=true
    ```
*   **Direct migrations & heavy data seeding**: Must use **Port 5432 (Session Mode)**. Do not run serverless application queries over Session Mode, as a single active client can block a connection slot indefinitely.

---

## 2. Advanced PostgreSQL Indexing Strategies

Queries on unindexed columns scan the entire database table (Sequential Scan). Under 100k user concurrency, sequential scans will saturate database CPU, bringing the server down.

### Required Database Indexes
1.  **Composite Index for User Progress Queries**: Since query calls constantly filter by both `user_id` and `lecture_id`, a multi-column composite index is essential:
    ```sql
    CREATE INDEX idx_user_lecture_progress ON user_progress (user_id, lecture_id);
    ```
2.  **Unique Constraints for Sync ID Safety**: To prevent synchronization tasks from inserting duplicate progress records:
    ```sql
    ALTER TABLE user_progress ADD CONSTRAINT unique_user_lecture UNIQUE (user_id, lecture_id);
    ```

---

## 3. The 3-Tier Cache Hit Hierarchy

To protect the server from being bombarded by redundant API requests, Harvi implements a **Strict 3-Tier Cache Hit Hierarchy**:

```
                       [ Incoming UI Query ]
                                 │
                   Tier 1: RAM Cache Map (Instant)
                   ├── HIT  ──► Return State
                   └── MISS ──► Tier 2: Disk Cache (AsyncStorage)
                                ├── HIT  ──► Warm RAM & Return State
                                └── MISS ──► Tier 3: Edge Server (Supabase API)
                                             ├── HIT  ──► Warm Disk & RAM & Return
                                             └── FAIL ──► Serve Stale Local Cache
```

*   **Rule**: UI elements must *never* reach direct network endpoints directly. They fetch data via this custom caching pipeline, reducing global server workload by up to 90%.

---

## 4. AI Database Scaling Heuristics

Future AI planning agents must follow this database modeling structure:

```
                  ┌──────────────────────────────┐
                  │    Database Schema Design    │
                  └──────────────┬───────────────┘
                                 │
                  Will the table exceed 50k entries?
                  ├── Yes ──► Enforce explicit indexes on WHERE/JOIN columns
                  │
                  └── No  ──► Does it serve dynamic read queries?
                              ├── Yes ──► Define index on foreign key columns
                              └── No  ──► Standard table keys definition
```

---

# Anti-Patterns

*   **Sequential Scans on Foreign Keys**: Creating tables with foreign key columns (like `subject_id` references `subjects`) without explicitly index defining them.
    *   *Consequence*: PostgreSQL will execute slow sequential scans on parent deletions and joins, capping maximum API concurrency to double-digits.
*   **Direct DB Queries from Mobile**: Allowing mobile clients to connect directly to the database layer without an API Gateway or Row Level Security (RLS) policies.
    *   *Consequence*: Exposure of database credentials, vulnerability to data-wipe exploits, and a direct path to database connection starvation.
*   **Database Trigger Bloat**: Writing complex, heavy calculations (like generating user notification reports or sync merges) inside synchronous PostgreSQL triggers.
    *   *Consequence*: Every write action blocks the transaction, slowing down API operations and freezing client requests during high-traffic intervals. Offload heavy triggers to asynchronous background Edge queues.
