/**
 * useProgress — returns a Set of lecture IDs the user has completed.
 *
 * Offline-first (instant, same pattern as useStats):
 *  - useLiveQuery automatically updates when SQLite changes.
 *  - useQuery handles the background server sync.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useMemo } from "react";
import { eq } from "drizzle-orm";

import { useAuth } from "@/src/shared/store/authStore";
import { fetchCompletedLectures } from "@/src/features/learn/services/progressService";
import { useDatabase } from "@/src/db/provider";
import { progress } from "@/src/db/schema";

// Re-export for backward compatibility
export {
  optimisticallyMarkComplete,
  writeProgressCache,
} from "@/src/features/learn/services/progressService";

export function useProgress() {
  const user = useAuth((s) => s.user);
  const db = useDatabase();

  const liveQ = useMemo(() => {
    return db
      .select({ lectureId: progress.lectureId })
      .from(progress)
      .where(user?.id ? eq(progress.userId, user.id) : eq(progress.userId, "none"));
  }, [db, user?.id]);

  const { data } = useLiveQuery(liveQ);

  useQuery({
    queryKey: ["progress_sync", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User required");
      return fetchCompletedLectures(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });

  return new Set((data ?? []).map((r) => r.lectureId));
}

/**
 * Empty compat function. useLiveQuery updates automatically now.
 */
export function useRefreshProgress() {
  return () => {};
}
