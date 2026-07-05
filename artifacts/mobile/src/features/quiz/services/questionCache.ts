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

let memoryCacheBypassed = false;

export async function saveQuestionsToCache(
  lectureId: string,
  questions: Question[]
): Promise<void> {
  memoryCacheBypassed = false;
  const entry: CachedLecture = {
    questions,
    questionCount: questions.length,
    downloadedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(KEY(lectureId), JSON.stringify(entry));
  } catch {
    // Best-effort — storage quota issues shouldn't crash the app
  }
}

export async function loadQuestionsFromCache(
  lectureId: string
): Promise<CachedLecture | null> {
  if (memoryCacheBypassed) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY(lectureId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = CachedLectureSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function clearLectureCache(lectureId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY(lectureId));
  } catch {
    // ignore
  }
}

export async function clearAllLectureCache(): Promise<void> {
  memoryCacheBypassed = true;
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith("harvi:qcache:"));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // ignore
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
