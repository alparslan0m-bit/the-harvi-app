import { useQuery } from "@tanstack/react-query";

import {
  loadQuestionsFromCache,
  loadQuestionsFromCacheSync,
  saveQuestionsToCache,
} from "@/src/features/quiz/services/questionCache";
import { fetchQuestions } from "@/src/features/quiz/services/questionService";
import { Question } from "@/src/shared/types";
import { QUESTION_CACHE_VERSION } from "@/src/shared/constants/cacheVersion";
import { useDatabase } from "@/src/db/provider";

// Re-export for backward compatibility (used by useSubjectCache)
export { fetchQuestions } from "@/src/features/quiz/services/questionService";

export function useQuizQuestions(lectureId: string) {
  const db = useDatabase();
  const cached = lectureId ? loadQuestionsFromCacheSync(db, lectureId) : null;
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
        // Network unavailable — serve from the pre-downloaded cache
        const cached = await loadQuestionsFromCache(lectureId);
        if (cached) {
          return cached.questions;
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
