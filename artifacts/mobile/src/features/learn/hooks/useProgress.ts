/**
 * useProgress — returns a Set of lecture IDs the user has completed.
 *
 * Offline-first (instant, same pattern as useStats):
 *  - Module-level memCache gives synchronous initialData on every mount
 *  - NetInfo check skips Supabase entirely when offline (no timeout wait)
 *  - On success   → writes to SQLite + memCache, merges queued IDs
 *  - On net error → serves last SQLite snapshot + queued offline IDs
 *  - gcTime 24 h  → stays in React-Query memory for the full app session
 *  - networkMode "offlineFirst" → re-runs queryFn even without connectivity
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/src/shared/store/authStore";
import {
  fetchCompletedLectures,
  readCacheSync,
} from "@/src/features/learn/services/progressService";
import { useDatabase } from "@/src/db/provider";

// Re-export for backward compatibility
export {
  optimisticallyMarkComplete,
  writeProgressCache,
} from "@/src/features/learn/services/progressService";

export function useProgress() {
  const user = useAuth((s) => s.user);

  const db = useDatabase();
  const memData = user?.id ? readCacheSync(db, user.id) : undefined;

  const query = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User required");
      return fetchCompletedLectures(user.id);
    },
    enabled: !!user?.id,
    // Serve last-known data synchronously — no loading spinner or blank counts
    initialData: memData,
    ...(memData ? { initialDataUpdatedAt: Date.now() - 1000 * 60 * 11 } : {}),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });

  return query.data ?? new Set<string>();
}

/**
 * Returns a function that immediately invalidates the progress query so
 * lecture cards refresh after a quiz finishes (online or offline).
 */
export function useRefreshProgress() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  return () => {
    if (user?.id) qc.invalidateQueries({ queryKey: ["progress", user.id] });
  };
}
