/**
 * statsMerge regression tests — audit P1-1 (offline stats double-count).
 *
 * The bug: `fetchStats` persisted a snapshot that ALREADY contained merged
 * pending results; the offline `serveFromCache` path then re-merged the same
 * still-queued items against that snapshot, counting each quiz twice.
 *
 * `mergeStatsWithPending` dedupes pending items whose `localId` already
 * appears in the snapshot's `recent_results`, so merging is idempotent no
 * matter what the snapshot already contains.
 */
import {
  applyPendingStats,
  mergeStatsWithPending,
  ZERO_STATS,
} from "../statsMerge";
import { PendingQuizResult, UserStats } from "@/src/shared/types/schemas";

const emptyMap = new Map<string, string>();

function pendingItem(overrides: Partial<PendingQuizResult> = {}): PendingQuizResult {
  return {
    localId: "local-1",
    userId: "u1",
    lectureId: "lec-1",
    score: 80,
    totalQuestions: 10,
    correctAnswers: 8,
    createdAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

function baseWithRecent(...items: UserStats["recent_results"]): UserStats {
  return {
    ...ZERO_STATS,
    total_quizzes: items.length,
    total_questions: items.reduce((s, r) => s + r.total_questions, 0),
    recent_results: items,
  };
}

// A snapshot that already folded in `local-1` (what the pre-fix online path
// actually persisted: the merged quiz appears in recent_results AND the
// aggregate counters already include it).
function foldedSnapshot(): UserStats {
  return baseWithRecent({
    id: "local-1",
    user_id: "u1",
    lecture_id: "lec-1",
    lecture_name: "Lecture One",
    score: 80,
    total_questions: 10,
    correct_answers: 8,
    created_at: "2026-08-01T10:00:00.000Z",
  });
}

describe("mergeStatsWithPending", () => {
  it("merges pending results into a fresh snapshot exactly once", () => {
    const base = baseWithRecent();
    const result = mergeStatsWithPending(base, [pendingItem()], emptyMap);

    expect(result.total_quizzes).toBe(1);
    expect(result.recent_results).toHaveLength(1);
    expect(result.recent_results[0]?.id).toBe("local-1");
    expect(result.average_score).toBe(80);
  });

  it("does NOT double-count pending results already present in the snapshot", () => {
    // Simulates the pre-fix persisted snapshot: the pending quiz was already
    // folded in during an earlier online fetch and written to user_stats
    // (recent_results AND the aggregates both contain it).
    const base = foldedSnapshot();

    // The same item is still queued (not yet synced) → old code added it AGAIN.
    const result = mergeStatsWithPending(base, [pendingItem()], emptyMap);

    expect(result.total_quizzes).toBe(1);
    expect(result.recent_results).toHaveLength(1);
    expect(result.recent_results[0]?.id).toBe("local-1");
  });

  it("merges only the not-yet-represented pending items", () => {
    const base = foldedSnapshot();

    const result = mergeStatsWithPending(
      base,
      [
        pendingItem(),
        pendingItem({
          localId: "local-2",
          lectureId: "lec-2",
          score: 50,
          totalQuestions: 10,
          correctAnswers: 5,
          createdAt: "2026-08-02T10:00:00.000Z",
        }),
      ],
      emptyMap,
    );

    // local-1 skipped (already present), local-2 merged → exactly one new quiz.
    expect(result.total_quizzes).toBe(2);
    expect(result.recent_results).toHaveLength(2);
    const ids = result.recent_results.map((r) => r.id).sort();
    expect(ids).toEqual(["local-1", "local-2"]);
  });

  it("returns the base unchanged when every pending item is already folded in", () => {
    const base = foldedSnapshot();
    const result = mergeStatsWithPending(base, [pendingItem()], emptyMap);
    expect(result).toBe(base);
  });
});

describe("applyPendingStats", () => {
  it("computes aggregates from pending + base", () => {
    const base: UserStats = {
      ...ZERO_STATS,
      total_quizzes: 1,
      total_questions: 10,
      average_score: 60,
      recent_results: [
        {
          id: "server-1",
          user_id: "u1",
          lecture_id: "lec-0",
          lecture_name: "Lecture Zero",
          score: 60,
          total_questions: 10,
          correct_answers: 6,
          created_at: "2026-07-01T10:00:00.000Z",
        },
      ],
    };

    const result = applyPendingStats(base, [pendingItem()], emptyMap);

    expect(result.total_quizzes).toBe(2);
    expect(result.total_questions).toBe(20);
    expect(result.average_score).toBe(70); // (60*1 + 80) / 2
    expect(result.best_score).toBe(80);
    expect(result.recent_results).toHaveLength(2);
  });
});