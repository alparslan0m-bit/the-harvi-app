import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  hasLocalAccessToLecture,
  loadQuestionsFromCache,
  loadQuestionsFromCacheSync,
  saveQuestionsToCache,
} from "@/src/features/quiz/services/questionCache";
import { fetchQuestions } from "@/src/features/quiz/services/questionService";
import { Question } from "@/src/shared/types";
import { QUESTION_CACHE_VERSION } from "@/src/shared/constants/cacheVersion";
import { useDatabase } from "@/src/db/provider";
import { useAuth } from "@/src/shared/store/authStore";

// Re-export for backward compatibility (used by useSubjectCache)
export { fetchQuestions } from "@/src/features/quiz/services/questionService";

export function useQuizQuestions(lectureId: string) {
  const db = useDatabase();
  const userId = useAuth((s) => s.user?.id);

  // Synchronous entitlement probe — memoized by inputs so the three sync
  // SQLite reads only run when `db`/`userId`/`lectureId` change (audit P3-8;
  // previously recomputed on every render).
  const canUseCached = useMemo(
    () =>
      !!lectureId &&
      !!userId &&
      hasLocalAccessToLecture(db, userId, lectureId),
    [db, userId, lectureId],
  );
  // Synchronous cache probe — only served to users with a local entitlement
  // to the lecture's content (audit P1-7). Memoized by `db` + `lectureId` so
  // the expensive sync read + JSON.parse only runs when inputs change (P2-10).
  const cached = useMemo(
    () => (canUseCached ? loadQuestionsFromCacheSync(db, lectureId) : null),
    [db, lectureId, canUseCached],
  );
  const initialData = cached?.questions;

  return useQuery({
    queryKey: ["quiz", lectureId, QUESTION_CACHE_VERSION],
    queryFn: async () => {
      try {
        const questions = await fetchQuestions(lectureId);
        // Auto-update the cache on every successful online fetch — keeps the
        // snapshot fresh so users who study online are always ready for offline.
        saveQuestionsToCache(lectureId, questions); // fire-and-forget
        return questions;
      } catch {
        // Network unavailable — serve from the pre-downloaded cache, but only
        // to users with a local entitlement to the content (audit P1-7).
        if (canUseCached) {
          const cached = await loadQuestionsFromCache(lectureId);
          if (cached) {
            return cached.questions;
          }
        }
        throw new Error(
          "You're offline and this lecture hasn't been downloaded yet.\n\nDownload the subject while online to take quizzes offline.",
        );
      }
    },
    enabled: !!lectureId,
    retry: 0,
    // Keep questions in memory for 5 min — navigating back to the same
    // lecture within a session skips the loading screen entirely.
    gcTime: 5 * 60 * 1000,
    staleTime: 0,
    networkMode: "offlineFirst",
    // Pre-populated from the on-device cache before query resolves → instant open
    initialData,
    // Treat as stale so a fresh fetch still happens in the background
    initialDataUpdatedAt: 0,
  });
}
