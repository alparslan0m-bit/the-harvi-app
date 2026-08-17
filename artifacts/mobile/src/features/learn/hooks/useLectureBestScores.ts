/**
 * useLectureBestScores — returns a Map<lectureId, bestScorePercent>.
 *
 * Offline-first (same pattern as useProgress):
 *  - useLiveQuery automatically updates when SQLite changes.
 *  - useQuery handles the background server sync.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useMemo } from "react";
import { eq } from "drizzle-orm";

import { useAuth } from "@/src/shared/store/authStore";
import { fetchBestScores, BestScoreMap } from "@/src/features/learn/services/bestScoreService";
import { useDatabase } from "@/src/db/provider";
import { bestScores } from "@/src/db/schema";

export {
  optimisticallyUpdateBestScore,
  writeCache as writeBestScoreCache,
} from "@/src/features/learn/services/bestScoreService";

export function useLectureBestScores(): BestScoreMap {
  const user = useAuth((s) => s.user);
  const db = useDatabase();

  const liveQ = useMemo(() => {
    return db
      .select({ lectureId: bestScores.lectureId, score: bestScores.score })
      .from(bestScores)
      .where(user?.id ? eq(bestScores.userId, user.id) : eq(bestScores.userId, "none"));
  }, [db, user?.id]);

  const { data } = useLiveQuery(liveQ);

  useQuery({
    queryKey: ["lectureBestScores_sync", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User required");
      return fetchBestScores(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });

  const map = new Map<string, number>();
  for (const r of data ?? []) {
    map.set(r.lectureId, r.score);
  }
  return map;
}

/**
 * Empty compat function. useLiveQuery updates automatically now.
 */
export function useRefreshBestScores() {
  return () => {};
}
