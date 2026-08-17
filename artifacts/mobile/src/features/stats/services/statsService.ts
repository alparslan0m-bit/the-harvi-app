/**
 * @file statsService.ts
 * @description Serves as the central data engine for computing user analytics, streak tracking,
 * weekly charts, and subject mastery percentages. Seamlessly merges server RPC data from Supabase
 * with pending local offline results to maintain live, zero-latency metrics.
 *
 * Phase B (plan.md §9): the persistent snapshot is the `user_stats` row (single
 * `payload` JSON column — the documented normalization exception, §4).
 *
 * Source-of-truth rule (audit P1-1): the persisted `user_stats` snapshot holds
 * ONLY server-derived data. Pending queue items are merged at read time (and
 * only once) via `mergeStatsWithPending`, which dedupes against the snapshot's
 * `recent_results`. This prevents the offline path from double-counting items
 * that were already folded into an earlier snapshot.
 */
import NetInfo from "@react-native-community/netinfo";

import { getQueueForUser } from "@/src/shared/services/offlineQueue";
import { supabase } from "@/src/shared/services/supabase";
import { isDeviceOnline } from "@/src/shared/utils/netInfo";
import { UserStats, UserStatsSchema } from "@/src/shared/types/schemas";
import { fetchHierarchy } from "@/src/features/learn/services/hierarchyService";
import { Database, getDb } from "@/src/db/client";
import { userStats } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import {
  mergeStatsWithPending,
  ZERO_STATS,
} from "@/src/features/stats/services/statsMerge";

// Re-export for backward compatibility (AccountActions renders an empty-state).
export { ZERO_STATS } from "@/src/features/stats/services/statsMerge";

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

// ── Types ────────────────────────────────────────────────────────────────────

export interface DbStats {
  total_quizzes?: number | null;
  total_questions_answered?: number | null;
  average_score?: number | null;
  best_score?: number | null;
  current_streak?: number | null;
  last_quiz_date?: string | null;
}

interface RpcRecentResult {
  id: string;
  user_id: string;
  lecture_id: string;
  lecture_name?: string | null;
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
}

interface RpcWeeklyActivity {
  dow: number;
  count: number;
}

interface RpcSubjectMastery {
  subject: string;
  mastery: number;
  attempts: number;
}

interface RpcStatsOverview {
  weekly_activity?: RpcWeeklyActivity[] | null;
  subject_mastery?: RpcSubjectMastery[] | null;
  recent_results?: RpcRecentResult[] | null;
}

// ── Disk helpers (SQLite canonical) ──────────────────────────────────────────

export function readCacheSync(db: Database, userId: string): UserStats | undefined {
  try {
    const row = db.$client.getFirstSync<{ payload: string }>(
      "SELECT payload FROM user_stats WHERE user_id = ?",
      userId,
    );
    if (!row) return undefined;
    const result = UserStatsSchema.safeParse(JSON.parse(row.payload));
    return result.success ? result.data : undefined;
  } catch (e) {
    if (__DEV__) console.warn("[statsService] readCacheSync error:", e);
    return undefined;
  }
}

async function readCache(userId: string): Promise<UserStats | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select({ payload: userStats.payload })
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);
    if (rows.length === 0) return null;
    const first = rows[0];
    if (!first) return null;
    const result = UserStatsSchema.safeParse(JSON.parse(first.payload));
    return result.success ? result.data : null;
  } catch (e) {
    if (__DEV__) console.warn("[statsService] Error reading cache:", e);
    return null;
  }
}

async function writeCache(userId: string, data: UserStats): Promise<void> {
  try {
    const db = await getDb();
    const payloadStr = JSON.stringify(data);
    const updatedAt = new Date().toISOString();
    await db.insert(userStats).values({
      userId,
      payload: payloadStr,
      updatedAt,
    }).onConflictDoUpdate({
      target: userStats.userId,
      set: { payload: payloadStr, updatedAt },
    });
  } catch (e) {
    if (__DEV__) console.warn("[statsService] Error writing cache:", e);
  }
}

// ── Lecture name map ─────────────────────────────────────────────────────────

/**
 * Builds a lectureId → name map from the on-device hierarchy cache (written by
 * every successful `fetchHierarchy`) — no extra network round-trip (audit P3-9).
 * Falls back to a single `lectures` fetch only when the local cache is empty.
 */
async function buildLectureNameMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const db = await getDb();
    const rows = await db.$client.getAllAsync<{ id: string; name: string }>(
      "SELECT id, name FROM hierarchy_lectures",
    );
    for (const row of rows) {
      if (row.id && row.name) map.set(row.id, row.name);
    }
    if (map.size > 0) return map;
  } catch (e) {
    if (__DEV__) console.warn("[statsService] Error reading lecture name cache:", e);
  }

  const queryPromise = supabase.from("lectures").select("id, name");
  const timeoutPromise = new Promise<{ data: unknown; error: unknown }>(
    (_, reject) => setTimeout(() => reject(new Error("timeout")), 10000),
  );

  let data: unknown;
  let error: unknown;
  try {
    const result = await Promise.race([queryPromise, timeoutPromise]);
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e;
  }

  if (error || !data) return map;
  const rows = Array.isArray(data) ? data : [];
  for (const row of rows) {
    const r =
      typeof row === "object" && row !== null
        ? (row as Record<string, unknown>)
        : {};
    const id = String(r["id"] ?? "");
    const name = String(r["name"] ?? "");
    if (id && name) map.set(id, name);
  }
  return map;
}

// ── Shared Stats Helpers ─────────────────────────────────────────────────────

function mapRpcToUserStats(
  rpcData: RpcStatsOverview | null,
  dbStats: DbStats | null,
): UserStats {
  const total_quizzes = dbStats?.total_quizzes ?? 0;
  const total_questions = dbStats?.total_questions_answered ?? 0;
  const average_score = dbStats?.average_score ?? 0;
  const best_score = dbStats?.best_score ?? 0;

  let streak = dbStats?.current_streak ?? 0;
  if (streak > 0 && dbStats?.last_quiz_date) {
    const lastQuiz = new Date(dbStats.last_quiz_date + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (now.getTime() - lastQuiz.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 1) streak = 0;
  }

  const todayDow = new Date().getDay();
  const todayIndex = (todayDow + 1) % 7; // Map 0-6 (Sun-Sat) to index where Sat is 0
  const weeklyMap = new Map<number, number>(
    (rpcData?.weekly_activity ?? []).map((w) => {
      const index = (w.dow + 1) % 7;
      return [index, w.count];
    }),
  );

  const weekly_activity = DAYS.map((day, i) => ({
    day,
    count: weeklyMap.get(i) ?? 0,
    isToday: i === todayIndex,
  }));

  const subject_mastery = (rpcData?.subject_mastery ?? []).map((m) => ({
    subject: m.subject ?? "Unknown",
    mastery: m.mastery ?? 0,
    attempts: m.attempts ?? 0,
  }));

  const recent_results = (rpcData?.recent_results ?? []).map((r) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    lecture_id: String(r.lecture_id),
    lecture_name: String(
      r.lecture_name ?? `Lecture ${String(r.lecture_id).slice(0, 6)}…`,
    ),
    score: Number(r.score ?? 0),
    total_questions: Number(r.total_questions ?? 0),
    correct_answers: Number(r.correct_answers ?? 0),
    created_at: String(r.created_at),
  }));

  return {
    total_quizzes,
    total_questions,
    // Keep the base average un-rounded (server NUMERIC(5,2)) so downstream
    // merges in applyPendingStats don't accumulate rounding drift (audit P3-10).
    average_score: Number(average_score) || 0,
    best_score: Math.round(Number(best_score) || 0),
    streak,
    weekly_activity,
    subject_mastery,
    recent_results,
  };
}

// ── Offline path (shared) ────────────────────────────────────────────────────

async function serveFromCache(userId: string): Promise<UserStats> {
  const [cached, pending] = await Promise.all([
    readCache(userId),
    getQueueForUser(userId),
  ]);

  if (!cached && pending.length === 0) return ZERO_STATS;

  const base = cached ?? ZERO_STATS;

  if (pending.length === 0) return base;

  const localMap = new Map<string, string>();
  base.recent_results?.forEach((r) =>
    localMap.set(r.lecture_id, r.lecture_name),
  );

  try {
    const hierarchy = await fetchHierarchy();
    hierarchy.forEach((year) =>
      year.modules.forEach((mod) =>
        mod.subjects.forEach((sub) =>
          sub.lectures.forEach((lec) => localMap.set(lec.id, lec.name)),
        ),
      ),
    );
  } catch (e) {
    // Ignore if hierarchy cache is missing
  }

  // Dedupe pending against what the snapshot already contains (audit P1-1):
  // the snapshot may already fold in some queued items from an earlier merge.
  return mergeStatsWithPending(base, pending, localMap);
}

// ── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Fetches the user's complete statistical profile (streaks, weekly activity,
 * average scores, and subject mastery).
 *
 * Integrates offline capabilities:
 * 1. Serves immediately from local cache if offline.
 * 2. Fetches via Supabase RPC `get_user_stats_overview` if online.
 * 3. Applies synthetic updates from any un-synced local offline queue results.
 *
 * @param userId - The ID of the authenticated user
 * @returns A Promise resolving to the comprehensive UserStats object
 */
export async function fetchStats(userId: string): Promise<UserStats> {
  const net = await NetInfo.fetch();
  const isOnline = isDeviceOnline(net);

  if (!isOnline) {
    return serveFromCache(userId);
  }

  let dbStats: DbStats | null = null;
  let rpcData: RpcStatsOverview | null = null;

  try {
    const statsQuery = supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const rpcQuery = supabase.rpc("get_user_stats_overview", {
      p_user_id: userId,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 10000),
    );

    const [statsRes, rpcRes] = await Promise.race([
      Promise.all([statsQuery, rpcQuery]),
      timeoutPromise,
    ]);

    if (rpcRes.error) throw rpcRes.error;

    dbStats = statsRes.data;
    rpcData = rpcRes.data;
  } catch (e) {
    if (__DEV__) console.warn("[statsService] Network error mid-request:", e);
    return serveFromCache(userId);
  }

  // Server-only snapshot — the canonical persisted source of truth (P1-1).
  // Pending results are merged at read time, so the cache never double-counts.
  const baseResult = mapRpcToUserStats(rpcData, dbStats);

  let pending = await getQueueForUser(userId);

  // Prevent double-counting: if the server already processed this quiz (but the client timed out and queued it),
  // it will be in the server's recent_results. We filter it out so we don't add its stats twice.
  const finalResult = await mergeStatsWithPending(
    baseResult,
    pending,
    await buildLectureNameMap(),
  );

  await writeCache(userId, baseResult);
  return finalResult;
}