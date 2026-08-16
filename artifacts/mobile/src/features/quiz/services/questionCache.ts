/**
 * questionCache — persists quiz questions to SQLite so each lecture can be
 * taken fully offline after a one-time download (plan.md §9 Phase B).
 *
 * Canonical store: the `questions` table via `QuestionRepository`, gated by
 * `app_meta['question_cache_version']` (single constant, §4). During the
 * bake window before the legacy-migration flag flips, reads fall back to the
 * legacy `harvi:qcache:{lectureId}` AsyncStorage keys; after the flag flips,
 * SQLite only.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  CachedLecture,
  CachedLectureSchema,
  Question,
} from "@/src/shared/types";
import { useCacheStore } from "@/src/shared/store/cacheStore";
import { QUESTION_CACHE_VERSION } from "@/src/shared/constants/cacheVersion";
import { getDb } from "@/src/db/client";
import { QuestionRepository } from "@/src/db/repositories/questionRepository";
import { MetaRepository } from "@/src/db/repositories/metaRepository";
import { isLegacyMigrationDone } from "@/src/db/migrationStatus";

const KEY = (id: string) => `harvi:qcache:${id}`;
const VERSION_GATE = "question_cache_version";

async function getQuestionRepo(): Promise<QuestionRepository> {
  return new QuestionRepository(await getDb());
}

/**
 * Writes the version gate to app_meta — the single constant drives both the
 * disk gate and the React Query queryKey (plan.md §4).
 */
async function persistVersionGate(): Promise<void> {
  await new MetaRepository(await getDb()).set(
    VERSION_GATE,
    QUESTION_CACHE_VERSION,
  );
}

export async function saveQuestionsToCache(
  lectureId: string,
  questions: Question[],
): Promise<void> {
  useCacheStore.getState().setQuestionCacheBypassed(false);
  try {
    const repo = await getQuestionRepo();
    await repo.replaceLecture(
      lectureId,
      questions.map((q) => ({
        id: q.id,
        lectureId,
        text: q.text,
        options: JSON.stringify(q.options),
        answer: q.answer,
        explanation: q.explanation,
        imageUrl: q.image_url ?? null,
      })),
    );
    await persistVersionGate();
  } catch (e) {
    if (__DEV__) console.warn("[questionCache] Error saving cache:", e);
    // Best-effort — storage issues shouldn't crash the app
  }
}

export async function loadQuestionsFromCache(
  lectureId: string,
): Promise<CachedLecture | null> {
  if (useCacheStore.getState().questionCacheBypassed) return null;

  if (await isLegacyMigrationDone()) {
    try {
      const meta = new MetaRepository(await getDb());
      const gate = await meta.get(VERSION_GATE);
      if (gate !== QUESTION_CACHE_VERSION) {
        if (__DEV__)
          console.log(
            `[questionCache] Invalid cache version gate, discarding lecture ${lectureId}.`,
          );
        return null;
      }
      const rows = await (await getQuestionRepo()).getByLecture(lectureId);
      if (rows.length === 0) return null;

      const questions: Question[] = rows.map((r) => ({
        id: r.id,
        text: r.text,
        options: JSON.parse(r.options) as string[],
        answer: r.answer,
        explanation: r.explanation,
        image_url: r.imageUrl ?? undefined,
      }));
      return {
        questions,
        questionCount: questions.length,
        downloadedAt: rows[0]!.downloadedAt,
        version: QUESTION_CACHE_VERSION,
      };
    } catch (e) {
      if (__DEV__) console.warn("[questionCache] Error loading cache:", e);
      return null;
    }
  }

  // ── Legacy AsyncStorage fallback (pre-migration) ─────────────────────────
  try {
    const raw = await AsyncStorage.getItem(KEY(lectureId));
    if (!raw) return null;
    const result = CachedLectureSchema.safeParse(JSON.parse(raw));
    if (!result.success) return null;
    if (result.data.version !== QUESTION_CACHE_VERSION) {
      if (__DEV__)
        console.log(
          `[questionCache] Invalid cache version for lecture ${lectureId}, discarding.`,
        );
      return null;
    }
    return result.data;
  } catch (e) {
    if (__DEV__) console.warn("[questionCache] Error loading cache:", e);
    return null;
  }
}

export async function clearLectureCache(lectureId: string): Promise<void> {
  try {
    await (await getQuestionRepo()).clearLecture(lectureId);
    if (!(await isLegacyMigrationDone())) {
      await AsyncStorage.removeItem(KEY(lectureId));
    }
  } catch (e) {
    if (__DEV__)
      console.warn("[questionCache] Error clearing lecture cache:", e);
  }
}

export async function clearAllLectureCache(): Promise<void> {
  useCacheStore.getState().setQuestionCacheBypassed(true);
  try {
    await (await getQuestionRepo()).clearAll();
    if (!(await isLegacyMigrationDone())) {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => k.startsWith("harvi:qcache:"));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    }
  } catch (e) {
    if (__DEV__) console.warn("[questionCache] Error clearing all cache:", e);
  }
}

/** Lightweight meta read — avoids deserialising the full questions array */
export async function getLectureCacheMeta(
  lectureId: string,
): Promise<{ questionCount: number; downloadedAt: string | null } | null> {
  if (await isLegacyMigrationDone()) {
    const meta = await (await getQuestionRepo()).getMeta(lectureId);
    if (!meta) return null;
    return {
      questionCount: meta.questionCount,
      downloadedAt: meta.downloadedAt,
    };
  }
  const cached = await loadQuestionsFromCache(lectureId);
  if (!cached) return null;
  return {
    questionCount: cached.questionCount,
    downloadedAt: cached.downloadedAt,
  };
}