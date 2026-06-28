/**
 * useStats — aggregates quiz_results into dashboard metrics.
 *
 * Offline-first (instant):
 *  - Module-level memCache gives synchronous initialData on every mount
 *  - NetInfo check skips Supabase entirely when offline (no timeout wait)
 *  - On success   → writes full UserStats to AsyncStorage + memCache
 *  - On net error → serves last AsyncStorage snapshot + merges queue
 */
import { useQuery } from "@tanstack/react-query";

import {
  fetchStats,
  memCache,
  warmed,
  warmMemCache,
} from "@/services/statsService";

// Re-export for backward compatibility
export { clearStatsCache } from "@/services/statsService";

export function useStats(userId: string | undefined) {
  // Kick off async warm of memCache on first call for this user.
  // By the time they navigate to the stats tab, memCache will be populated.
  if (userId && !warmed.has(userId)) {
    warmMemCache(userId);
  }

  const memData = userId ? memCache.get(userId) : undefined;

  return useQuery({
    queryKey: ["stats", userId],
    queryFn: () => fetchStats(userId!),
    enabled: !!userId,
    // Serve last-known data synchronously — no loading spinner on re-visits
    initialData: memData,
    // Treat initialData as stale so a background refresh still runs
    initialDataUpdatedAt: memData ? Date.now() - 1000 * 60 * 11 : undefined,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });
}
