/**
 * useLectureBestScores — returns a Map<lectureId, bestScorePercent>.
 *
 * Offline-first (same pattern as useProgress):
 *  - memCache gives synchronous initialData on every mount
 *  - NetInfo check skips Supabase when offline
 *  - gcTime 24h → stays in React-Query memory for the full session
 *  - networkMode "offlineFirst" → re-runs queryFn even without connectivity
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/src/shared/store/authStore";
import {
  fetchBestScores,
  memCache,
  warmed,
  warmMemCache,
  BestScoreMap,
} from "@/src/features/learn/services/bestScoreService";

export {
  clearBestScoreCache,
  optimisticallyUpdateBestScore,
  writeCache as writeBestScoreCache,
} from "@/src/features/learn/services/bestScoreService";

export function useLectureBestScores(): BestScoreMap {
  const user = useAuth((s) => s.user);

  // Warm memCache on first call
  if (user?.id && !warmed.has(user.id)) {
    warmMemCache(user.id);
  }

  const memData = user?.id ? memCache.get(user.id) : undefined;

  const query = useQuery({
    queryKey: ["lectureBestScores", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User required");
      return fetchBestScores(user.id);
    },
    enabled: !!user?.id,
    initialData: memData,
    ...(memData ? { initialDataUpdatedAt: Date.now() - 1000 * 60 * 11 } : {}),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });

  return query.data ?? new Map<string, number>();
}

/**
 * Returns a function that invalidates the best-scores query
 * so lecture cards refresh after a quiz finishes.
 */
export function useRefreshBestScores() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  return () => {
    if (user?.id)
      qc.invalidateQueries({ queryKey: ["lectureBestScores", user.id] });
  };
}
