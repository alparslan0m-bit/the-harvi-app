# API Template: Scaffolding Blueprint for Safe Database Queries

This template provides the standard database pre-flight checks, dynamic schema resolvers, and PG SQL constraint interceptors required to execute safe database queries in the App Factory workspace.

---

## 📂 Proposed File Path

Database queries and query hook wraps must reside in a dedicated network layer. For example:

```
c:\Users\METRO\harvi gamed\
└── hooks/
    └── useCachedSubjectData.ts  # Integrated Query + Cache Pre-flight Hook
```

---

## 💻 Code Scaffolding

```typescript
// hooks/useCachedSubjectData.ts
import { useQuery } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

// ── 1. DYNAMIC SCHEMA COLUMN RESOLVER ──
const CANDIDATE_COLUMN_KEYS = ["subject_id", "module_id", "category_id"];

export function resolveSubjectColumn(row: Record<string, any>): string | null {
  for (const key of CANDIDATE_COLUMN_KEYS) {
    if (key in row) return row[key];
  }
  return null;
}

// ── 2. MAIN SECURE DATABASE TRANSACTION QUERY ──
export async function fetchSubjectDataSecure(id: string) {
  // A. Network Pre-flight Check
  const netState = await NetInfo.fetch();
  const isOnline = (netState.isConnected ?? false) && netState.isInternetReachable !== false;

  if (!isOnline) {
    // Serve offline backup if internet is unavailable
    const cachedData = await AsyncStorage.getItem(`subjects:cache:${id}`);
    if (cachedData) return JSON.parse(cachedData);
    throw new Error("Device is offline with no local data available");
  }

  try {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, order_index")
      .eq("id", id)
      .single();

    if (error) {
      // B. Dynamic SQL Schema Error Interceptor
      if (error.code === "42703") { // PG Undefined Column Code
        console.warn("Schema drift detected. Retrying with dynamic fallback queries...");
        return fallbackQuery(id);
      }
      throw error;
    }

    // C. Update Local Cache Layer
    await AsyncStorage.setItem(`subjects:cache:${id}`, JSON.stringify(data));
    return data;
  } catch (err) {
    console.error("API Fetch execution failed:", err);
    // Serve stale cache as a safety net
    const cachedData = await AsyncStorage.getItem(`subjects:cache:${id}`);
    if (cachedData) return JSON.parse(cachedData);
    throw err;
  }
}

async function fallbackQuery(id: string) {
  // Fallback transaction mapping
  const { data, error } = await supabase.from("subjects").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

// ── 3. TANSTACK QUERY WRAPPER HOOK ──
export function useCachedSubjectData(id: string) {
  return useQuery({
    queryKey: ["subjects", id],
    queryFn: () => fetchSubjectDataSecure(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache validity
  });
}
```

---

## ⚙️ Generation Rules & Best Practices

1.  **Always enforce NetInfo Pre-flight**: Before executing any network call, check device connectivity. If the user is offline, return local cache instantly instead of waiting for a network timeout.
2.  **Include Dynamic Column Resolvers**: To prevent application crashes when the database schema changes (e.g. renaming column names), write a fallback resolver helper to candidate-check keys.
3.  **Strict Error code handling**: Never display raw PG constraints or system exceptions directly to users. Trap error codes (like `42703` for undefined columns, `23505` for unique violations) and serve clean fallback states.

---

## 📈 Scalability Notes

*   **Transactional Stored Procedures (RPCs)**: For complex multi-table joins or mutations, bypass standard client select calls and trigger a dedicated PostgreSQL RPC (using `supabase.rpc()`) to minimize payload sizes over mobile connections.
*   **Prevent Connection Exhaustion**: Edges and serverless function calls must route through port `6543` in Transaction Mode to recycle database connections efficiently.
