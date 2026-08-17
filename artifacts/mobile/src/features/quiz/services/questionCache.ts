/**
 * questionCache — persists quiz questions to SQLite so each lecture can be
 * taken fully offline after a one-time download (plan.md §9 Phase B).
 *
 * Canonical store: the `questions` table via `QuestionRepository`, gated by
 * `app_meta['question_cache_version']` (single constant, §4).
 */
import {
  CachedLecture,
  Question,
} from "@/src/shared/types";
import { useCacheStore } from "@/src/shared/store/cacheStore";
import { QUESTION_CACHE_VERSION } from "@/src/shared/constants/cacheVersion";
import { Database, getDb } from "@/src/db/client";
import { QuestionRepository } from "@/src/db/repositories/questionRepository";
import { MetaRepository } from "@/src/db/repositories/metaRepository";

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

/**
 * Returns true when the user has a local entitlement to a lecture's questions,
 * so the offline cache is only served to users who actually own the content
 * (audit P1-7 — prevents a later user on a shared device taking offline
 * quizzes for content they don't own).
 *
 * A lecture is accessible when it is free, or the user has a local
 * `access_map` entry (`has_access = 1`) for its subject or parent module.
 */
export function hasLocalAccessToLecture(
  db: Database,
  userId: string,
  lectureId: string,
): boolean {
  try {
    const lecture = db.$client.getFirstSync<{
      subject_id: string | null;
      is_free: number | null;
    }>("SELECT subject_id, is_free FROM hierarchy_lectures WHERE id = ?", lectureId);
    if (!lecture) return false;
    if (lecture.is_free === 1) return true;

    const subject = lecture.subject_id
      ? db.$client.getFirstSync<{ module_id: string | null }>(
          "SELECT module_id FROM hierarchy_subjects WHERE id = ?",
          lecture.subject_id,
        )
      : null;

    const itemIds: string[] = [];
    if (lecture.subject_id) itemIds.push(lecture.subject_id);
    if (subject?.module_id) itemIds.push(subject.module_id);
    if (itemIds.length === 0) return false;

    const placeholders = itemIds.map(() => "?").join(", ");
    const row = db.$client.getFirstSync<{ has_access: number }>(
      `SELECT has_access FROM access_map WHERE user_id = ? AND item_id IN (${placeholders}) LIMIT 1`,
      userId,
      ...itemIds,
    );
    return row?.has_access === 1;
  } catch (e) {
    if (__DEV__) console.warn("[questionCache] hasLocalAccessToLecture error:", e);
    return false;
  }
}

export async function loadQuestionsFromCache(
  lectureId: string,
): Promise<CachedLecture | null> {
  if (useCacheStore.getState().questionCacheBypassed) return null;

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

export function loadQuestionsFromCacheSync(
  db: Database,
  lectureId: string,
): CachedLecture | null {
  if (useCacheStore.getState().questionCacheBypassed) return null;

  try {
    const gateRow = db.$client.getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'question_cache_version'"
    );
    if (gateRow?.value !== QUESTION_CACHE_VERSION) {
      return null;
    }

    const rows = db.$client.getAllSync<{
      id: string;
      text: string;
      options: string;
      answer: number;
      explanation: string;
      image_url: string | null;
      downloaded_at: string;
    }>(
      "SELECT id, text, options, answer, explanation, image_url, downloaded_at FROM questions WHERE lecture_id = ? ORDER BY downloaded_at ASC",
      lectureId,
    );

    if (rows.length === 0) return null;

    const questions: Question[] = rows.map((r) => ({
      id: r.id,
      text: r.text,
      options: JSON.parse(r.options) as string[],
      answer: r.answer,
      explanation: r.explanation,
      image_url: r.image_url ?? undefined,
    }));

    return {
      questions,
      questionCount: questions.length,
      downloadedAt: rows[0]!.downloaded_at,
      version: QUESTION_CACHE_VERSION,
    };
  } catch (e) {
    if (__DEV__) console.warn("[questionCache] Error loading cache sync:", e);
    return null;
  }
}

export async function clearLectureCache(lectureId: string): Promise<void> {
  try {
    await (await getQuestionRepo()).clearLecture(lectureId);
  } catch (e) {
    if (__DEV__)
      console.warn("[questionCache] Error clearing lecture cache:", e);
  }
}

export async function clearAllLectureCache(): Promise<void> {
  useCacheStore.getState().setQuestionCacheBypassed(true);
  try {
    await (await getQuestionRepo()).clearAll();
  } catch (e) {
    if (__DEV__) console.warn("[questionCache] Error clearing all cache:", e);
  }
}

/** Lightweight meta read — avoids deserialising the full questions array */
export async function getLectureCacheMeta(
  lectureId: string,
): Promise<{ questionCount: number; downloadedAt: string | null } | null> {
  const meta = await (await getQuestionRepo()).getMeta(lectureId);
  if (!meta) return null;
  return {
    questionCount: meta.questionCount,
    downloadedAt: meta.downloadedAt,
  };
}