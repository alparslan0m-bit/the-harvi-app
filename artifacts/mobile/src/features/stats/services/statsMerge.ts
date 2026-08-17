/**
 * @file statsMerge.ts
 * @description Pure, dependency-free helpers for merging locally-pending quiz
 * results into a server-derived `UserStats` snapshot. Kept free of NetInfo /
 * Supabase / SQLite imports so the merge + dedupe logic is unit-testable in
 * isolation (audit P1-1: the offline path previously re-merged pending items
 * that were already folded into the persisted snapshot, double-counting them).
 *
 * Source-of-truth rule: `base` is the server-only snapshot. Pending items are
 * merged exactly once per read. `mergeStatsWithPending` dedupes pending items
 * whose `localId` already appears in `base.recent_results` before folding, so
 * a stale snapshot that already contains them (e.g. written by an older app
 * build) cannot double-count.
 */
import { PendingQuizResult, UserStats } from "@/src/shared/types/schemas";

const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

export const ZERO_STATS: UserStats = {
  total_quizzes: 0,
  total_questions: 0,
  average_score: 0,
  best_score: 0,
  streak: 0,
  weekly_activity: DAYS.map((day) => ({ day, count: 0 })),
  subject_mastery: [],
  recent_results: [],
};

type RawRow = {
  id: string;
  user_id: string;
  lecture_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
};

/**
 * Merges pending offline results into a server-only snapshot, deduping any
 * pending item whose `localId` is already represented in the snapshot's
 * `recent_results` (audit P1-1). Returns `base` unchanged when nothing new
 * needs merging.
 *
 * @param base - Server-only stats snapshot (must NOT contain pending data)
 * @param pending - Currently-queued offline quiz results
 * @param localMap - lectureId → lecture name map for display fallbacks
 */
export function mergeStatsWithPending(
  base: UserStats,
  pending: PendingQuizResult[],
  localMap: Map<string, string>,
): UserStats {
  if (pending.length === 0) return base;
  const knownIds = new Set((base.recent_results ?? []).map((r) => r.id));
  const fresh = pending.filter((q) => !knownIds.has(q.localId));
  if (fresh.length === 0) return base;
  return applyPendingStats(base, fresh, localMap);
}

export function applyPendingStats(
  base: UserStats,
  pending: PendingQuizResult[],
  localMap: Map<string, string>,
): UserStats {
  const syntheticRows: RawRow[] = pending.map((q) => ({
    id: q.localId,
    user_id: q.userId,
    lecture_id: q.lectureId,
    score: q.score,
    total_questions: q.totalQuestions,
    correct_answers: q.correctAnswers,
    created_at: q.createdAt,
  }));

  const cachedRows: RawRow[] = (base.recent_results ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    lecture_id: r.lecture_id,
    score: r.score,
    total_questions: r.total_questions,
    correct_answers: r.correct_answers,
    created_at: r.created_at,
  }));

  const mergedRows = [...syntheticRows, ...cachedRows]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 10);

  const newTotalQuizzes = base.total_quizzes + pending.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  const dow = weekStart.getDay();
  const daysSinceSaturday = (dow + 1) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceSaturday);
  const weekStartMs = weekStart.getTime();

  const weekly_activity = base.weekly_activity.map((a) => ({ ...a }));
  pending.forEach((q) => {
    const d = new Date(q.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= weekStartMs) {
      const qDow = d.getDay();
      const index = (qDow + 1) % 7;
      const entry = weekly_activity[index];
      if (entry) entry.count++;
    }
  });

  const masteryMap = new Map<
    string,
    { subject: string; totalScore: number; attempts: number }
  >();
  base.subject_mastery.forEach((m) => {
    masteryMap.set(m.subject, { ...m, totalScore: m.mastery * m.attempts });
  });

  pending.forEach((q) => {
    const subjName =
      localMap.get(q.lectureId) ?? `Lecture ${q.lectureId.slice(0, 6)}…`;
    const existing = masteryMap.get(subjName) ?? {
      subject: subjName,
      totalScore: 0,
      attempts: 0,
    };
    existing.totalScore += q.score;
    existing.attempts += 1;
    masteryMap.set(subjName, existing);
  });

  const subject_mastery = Array.from(masteryMap.values())
    .map((m) => ({
      subject: m.subject,
      mastery: Math.round(m.totalScore / m.attempts),
      attempts: m.attempts,
    }))
    .sort((a, b) => b.mastery - a.mastery);

  const recent_results = mergedRows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    lecture_id: r.lecture_id,
    lecture_name:
      localMap.get(r.lecture_id) ?? `Lecture ${r.lecture_id.slice(0, 6)}…`,
    score: r.score ?? 0,
    total_questions: r.total_questions ?? 0,
    correct_answers: r.correct_answers ?? 0,
    created_at: r.created_at,
  }));

  let newStreak = base.streak;

  // Calculate optimistic streak
  let lastEvaluatedDate: Date | null = null;
  if (base.recent_results && base.recent_results.length > 0) {
    const firstResult = base.recent_results[0];
    if (firstResult?.created_at) {
      lastEvaluatedDate = new Date(firstResult.created_at);
      lastEvaluatedDate.setHours(0, 0, 0, 0);
    }
  }

  const sortedPending = [...pending].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const p of sortedPending) {
    const pDate = new Date(p.createdAt);
    pDate.setHours(0, 0, 0, 0);

    if (!lastEvaluatedDate) {
      newStreak = 1;
      lastEvaluatedDate = pDate;
    } else {
      const diffDays = Math.round(
        (pDate.getTime() - lastEvaluatedDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
        newStreak += 1;
        lastEvaluatedDate = pDate;
      } else if (diffDays > 1) {
        newStreak = 1;
        lastEvaluatedDate = pDate;
      }
    }
  }

  // Also check if the streak has died as of *today*
  const todayForStreak = new Date();
  todayForStreak.setHours(0, 0, 0, 0);
  if (lastEvaluatedDate) {
    const diffToToday = Math.round(
      (todayForStreak.getTime() - lastEvaluatedDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diffToToday > 1) {
      newStreak = 0;
    }
  }

  return {
    total_quizzes: newTotalQuizzes,
    total_questions:
      base.total_questions +
      pending.reduce((s, p) => s + (p.totalQuestions ?? 0), 0),
    average_score:
      newTotalQuizzes === 0
        ? 0
        : Math.round(
            (base.average_score * base.total_quizzes +
              pending.reduce((s, p) => s + (p.score ?? 0), 0)) /
              newTotalQuizzes,
          ),
    best_score: Math.max(base.best_score, ...pending.map((p) => p.score ?? 0)),
    streak: newStreak,
    weekly_activity,
    subject_mastery,
    recent_results,
  };
}