# API Generation Engine: Connectivity Preflights, Schema Resolvers & Error Interceptors

This document defines the automated stages, dynamic column resolvers, and database exception handlers required by AI agents to construct secure API clients and database queries.

---

## 1. API Generation Workflow

All generated API functions must execute three safety preflights before requesting data from the database:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: Connection Preflight               │
        │  Verify online network status using NetInfo checks     │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 2: Token Refresh Preflight            │
        │  Confirm active session token is valid and unexpired   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 3: Database Query                    │
        │  Execute Supabase query, select exact columns only     │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 4: Dynamic Parse & Probe              │
        │  Resolve properties using dynamic column-probing lists │
        └────────────────────────────────────────────────────────┘
```

---

## 2. SQL Exception Catching & Interceptors

All generated queries must be wrapped in `try-catch` blocks designed to capture and sanitize database exception codes:

```typescript
import { PostgrestError } from "@supabase/supabase-js";

export function handlePostgresError(error: PostgrestError): { message: string } {
  // Prevent leaking internal Postgres schemas to users
  switch (error.code) {
    case "23505": // Unique violation
      return { message: "An active progress record already exists for this topic." };
    case "42703": // Undefined column
      return { message: "The database schema has evolved. We are updating your cache." };
    default:
      return { message: "A database error occurred. Telemetry has been logged." };
  }
}
```

---

## 3. Dynamic Column-Probing Pattern

```typescript
const KEY_VARIANTS = ["question_text", "question", "text", "body", "content"];

export function probeProperty(row: any, candidates: string[]): any {
  for (const candidate of candidates) {
    if (candidate in row) return row[candidate];
  }
  return null;
}
```

---

# Anti-Patterns to Avoid

*   **Implicit Database Traversal (`select("*")`)**: Fetching all columns in high-traffic queries.
    *   *Consequence*: balloons network packet sizes, slows client rendering, and increases database server memory usage.
*   **Leaking SQL Constraints**: Displaying raw database error codes (e.g. `23505`) directly inside user-facing visual alerts.
    *   *Consequence*: Exposes internal database architectures to attackers, creating security risks.
