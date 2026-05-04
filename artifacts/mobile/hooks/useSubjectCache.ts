/**
 * useSubjectCache
 *
 * Manages the offline-download state for a single subject (all its lectures).
 *
 * Status values
 *   "none"        — no lectures are cached
 *   "partial"     — some lectures cached (download was interrupted or started)
 *   "downloaded"  — all lectures cached and up to date
 *   "stale"       — all cached but ≥1 lecture has new questions (liveCount > cachedCount)
 *   "downloading" — download in progress
 *
 * Staleness detection
 *   Each lecture in the hierarchy already carries `question_count` (the live total).
 *   We compare it against the count saved at download time. If the live count is
 *   higher, new questions have been added — the user should re-download.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getLectureCacheMeta,
  saveQuestionsToCache,
} from "@/lib/questionCache";
import { fetchQuestions } from "@/hooks/useQuiz";
import { Subject } from "@/types";

export type SubjectCacheStatus =
  | "none"
  | "partial"
  | "downloaded"
  | "stale"
  | "downloading";

export interface LectureCacheInfo {
  lectureId: string;
  isCached: boolean;
  cachedCount: number;
  liveCount: number;
  /** true when liveCount > cachedCount — new questions available */
  isStale: boolean;
  downloadedAt: string | null;
}

export interface SubjectCacheState {
  status: SubjectCacheStatus;
  /** { done, total } while status === "downloading", else { done: 0, total: 0 } */
  progress: { done: number; total: number };
  lectureInfo: LectureCacheInfo[];
  downloadSubject: () => Promise<void>;
  /** Total new questions across all stale lectures */
  newQuestionCount: number;
}

export function useSubjectCache(subject: Subject | undefined): SubjectCacheState {
  const [status, setStatus] = useState<SubjectCacheStatus>("none");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lectureInfo, setLectureInfo] = useState<LectureCacheInfo[]>([]);
  const downloading = useRef(false);

  const loadState = useCallback(async () => {
    if (!subject || subject.lectures.length === 0) return;

    const infos: LectureCacheInfo[] = await Promise.all(
      subject.lectures.map(async (lec) => {
        const meta = await getLectureCacheMeta(lec.id);
        const liveCount = lec.question_count ?? 0;
        const cachedCount = meta?.questionCount ?? 0;
        return {
          lectureId: lec.id,
          isCached: !!meta,
          cachedCount,
          liveCount,
          isStale: !!meta && liveCount > cachedCount,
          downloadedAt: meta?.downloadedAt ?? null,
        };
      })
    );

    setLectureInfo(infos);

    const total = infos.length;
    const cached = infos.filter((i) => i.isCached).length;
    const stale = infos.some((i) => i.isStale);

    if (cached === 0) setStatus("none");
    else if (cached < total) setStatus("partial");
    else if (stale) setStatus("stale");
    else setStatus("downloaded");
  }, [subject]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const downloadSubject = useCallback(async () => {
    if (!subject || downloading.current) return;

    downloading.current = true;
    setStatus("downloading");
    setProgress({ done: 0, total: subject.lectures.length });

    for (let i = 0; i < subject.lectures.length; i++) {
      const lec = subject.lectures[i];
      try {
        const questions = await fetchQuestions(lec.id);
        if (questions.length > 0) {
          await saveQuestionsToCache(lec.id, questions);
        }
      } catch {
        // Continue — one failed lecture shouldn't abort the whole download
      }
      setProgress({ done: i + 1, total: subject.lectures.length });
    }

    downloading.current = false;
    await loadState();
  }, [subject, loadState]);

  const newQuestionCount = lectureInfo.reduce(
    (sum, i) => sum + (i.isStale ? i.liveCount - i.cachedCount : 0),
    0
  );

  return { status, progress, lectureInfo, downloadSubject, newQuestionCount };
}
