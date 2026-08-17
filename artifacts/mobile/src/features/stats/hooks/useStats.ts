/**
 * useStats — aggregates quiz_results into dashboard metrics.
 *
 * Offline-first (instant):
 *  - Module-level memCache gives synchronous initialData on every mount
 *  - NetInfo check skips Supabase entirely when offline (no timeout wait)
 *  - On success   → writes full UserStats to SQLite + memCache
 *  - On net error → serves last SQLite snapshot + merges queue
 */
import { useQuery } from "@tanstack/react-query";

import {
  fetchStats,
  readCacheSync,
} from "@/src/features/stats/services/statsService";
import { useDatabase } from "@/src/db/provider";


export function useStats(userId: string | undefined) {
  const db = useDatabase();
  const memData = userId ? readCacheSync(db, userId) : undefined;

  return useQuery({
    queryKey: ["stats", userId],
    queryFn: () => fetchStats(userId!),
    enabled: !!userId,
    // Serve last-known data synchronously — no loading spinner on re-visits
    initialData: memData,
    // Treat initialData as stale so a background refresh still runs
    ...(memData ? { initialDataUpdatedAt: Date.now() - 1000 * 60 * 11 } : {}),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });
}
