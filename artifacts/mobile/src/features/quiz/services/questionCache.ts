/**
 * questionCache — persists quiz questions to AsyncStorage so each lecture
 * can be taken fully offline after a one-time download.
 *
 * Key schema
 *   harvi:qcache:{lectureId}  →  CachedLecture JSON
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { CachedLecture, CachedLectureSchema, Question } from "@/src/shared/types";

const KEY = (id: string) => `harvi:qcache:${id}`;

import { useCacheStore } from "@/src/shared/store/cacheStore";

export async function saveQuestionsToCache(
  lectureId: string,
  questions: Question[]
): Promise<void> {
  useCacheStore.getState().setQuestionCacheBypassed(false);
  const entry: CachedLecture = {
    questions,
    questionCount: questions.length,
    downloadedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(KEY(lectureId), JSON.stringify(entry));
  } catch (e) {
    if (__DEV__) console.warn('[questionCache] Error saving cache:', e);
    // Best-effort — storage quota issues shouldn't crash the app
  }
}

export async function loadQuestionsFromCache(
  lectureId: string
): Promise<CachedLecture | null> {
  if (useCacheStore.getState().questionCacheBypassed) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY(lectureId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = CachedLectureSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch (e) {
    if (__DEV__) console.warn('[questionCache] Error loading cache:', e);
    return null;
  }
}

export async function clearLectureCache(lectureId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY(lectureId));
  } catch (e) {
    if (__DEV__) console.warn('[questionCache] Error clearing lecture cache:', e);
  }
}

export async function clearAllLectureCache(): Promise<void> {
  useCacheStore.getState().setQuestionCacheBypassed(true);
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith("harvi:qcache:"));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (e) {
    if (__DEV__) console.warn('[questionCache] Error clearing all cache:', e);
  }
}

/** Lightweight meta read — avoids deserialising the full questions array */
export async function getLectureCacheMeta(
  lectureId: string
): Promise<Pick<CachedLecture, "questionCount" | "downloadedAt"> | null> {
  const cached = await loadQuestionsFromCache(lectureId);
  if (!cached) return null;
  return { questionCount: cached.questionCount, downloadedAt: cached.downloadedAt };
}
