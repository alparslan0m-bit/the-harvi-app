/**
 * useProgress — returns a Set of lecture IDs the user has completed.
 *
 * Offline-first (instant, same pattern as useStats):
 *  - Module-level memCache gives synchronous initialData on every mount
 *  - NetInfo check skips Supabase entirely when offline (no timeout wait)
 *  - On success   → writes to AsyncStorage + memCache, merges queued IDs
 *  - On net error → serves last AsyncStorage snapshot + queued offline IDs
 *  - gcTime 24 h  → stays in React-Query memory for the full app session
 *  - networkMode "offlineFirst" → re-runs queryFn even without connectivity
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import {
  fetchCompletedLectures,
  memCache,
  warmed,
  warmMemCache,
} from "@/services/progressService";

// Re-export for backward compatibility
export {
  clearProgressCache,
  optimisticallyMarkComplete,
  writeProgressCache,
} from "@/services/progressService";

export function useProgress() {
  const { user } = useAuth();

  // Kick off async warm of memCache on first call for this user.
  // By the time they navigate to a subject, memCache will be populated.
  if (user?.id && !warmed.has(user.id)) {
    warmMemCache(user.id);
  }

  const memData = user?.id ? memCache.get(user.id) : undefined;

  const query = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => fetchCompletedLectures(user!.id),
    enabled: !!user?.id,
    // Serve last-known data synchronously — no loading spinner or blank counts
    initialData: memData,
    initialDataUpdatedAt: memData ? Date.now() - 1000 * 60 * 11 : undefined,
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
  const { user } = useAuth();
  return () => {
    if (user?.id) qc.invalidateQueries({ queryKey: ["progress", user.id] });
  };
}
