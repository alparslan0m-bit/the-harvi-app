# AI API Generation Rules: Database RPCs & Dynamic Columns

These rules instruct future AI agents on how to construct database queries, integrate serverless edge transactions, and probe database tables dynamically inside the Harvi mobile client.

---

## 1. Dynamic Database Column Resolution

To protect the application from crashes due to backend schema updates (e.g. renaming columns), query parsers must probe candidate fields dynamically:

```typescript
const CANDIDATE_KEYS = ["lecture_id", "subject_id", "content_id"];

export function resolveColumn(row: Record<string, any>): string | null {
  for (const key of CANDIDATE_KEYS) {
    if (key in row) return row[key];
  }
  return null;
}
```

---

## 2. API Generation Rules

1.  **Strict Stored Procedures for complex joins**: Avoid loading heavy table structures to perform nested maps in JS. Write a clean database RPC (Stored Procedure) on PostgreSQL and trigger it via `supabase.rpc()`.
2.  **Explicit Network Guards**: Pre-flight check the network connection before making API calls. If the device is offline, short-circuit immediately to cache to prevent timeouts.
3.  **Strict SQL Error Checking**: Catch database errors and handle common codes gracefully (such as `42703` for missing columns or codes starting with `23` for database constraints) to trigger custom fallback pathways.

---

## 3. Reference Database RPC Query Blueprint

```typescript
import { supabase } from "@/lib/supabase";
import NetInfo from "@react-native-community/netinfo";

export async function fetchModuleHierarchy() {
  const net = await NetInfo.fetch();
  const isOnline = (net.isConnected ?? false) && net.isInternetReachable !== false;

  if (!isOnline) {
    return serveLocalCache();
  }

  try {
    const { data, error } = await supabase
      .from("modules")
      .select("id, name, order_index")
      .order("order_index", { ascending: true });

    if (error) {
      if (error.code === "42703") {
        // Skip dynamically and fall back to alternative configurations
        return fallbackQuery();
      }
      throw error;
    }

    await saveToCache(data);
    return data;
  } catch (err) {
    return serveLocalCache();
  }
}
```
