/**
 * Single source of truth for the question-cache version gate.
 *
 * Bumped in lockstep across every consumer so disk and query caches cannot
 * desync (plan.md §4): `questionCache.saveQuestionsToCache` stores this value
 * in `app_meta['question_cache_version']`, `loadQuestionsFromCache` validates
 * against it, and `useQuiz` embeds it in the React Query queryKey.
 */
export const QUESTION_CACHE_VERSION = "v3";