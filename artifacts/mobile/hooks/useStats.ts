/**
 * useStats — aggregates quiz_results into dashboard metrics.
 *
 * Offline-first (instant):
 *  - Module-level memCache gives synchronous initialData on every mount
 *  - NetInfo check skips Supabase entirely when offline (no timeout wait)
 *  - On success   → writes full UserStats to AsyncStorage + memCache
 *  - On net error → serves last AsyncStorage snapshot + merges queue
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";

import { getQueue } from "@/lib/offlineQueue";
import { supabase } from "@/lib/supabase";
import { UserStats } from "@/types";

const CACHE_KEY = (uid: string) => `harvi:stats:${uid}`;

// ── Module-level memory cache (survives re-renders, cleared on app restart) ──
const memCache = new Map<string, UserStats>();

// ── AsyncStorage helpers ─────────────────────────────────────────────────────

async function readCache(userId: string): Promise<UserStats | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(userId));
    if (!raw) return null;
    return JSON.parse(raw) as UserStats;
  } catch {
    return null;
  }
}

async function writeCache(userId: string, data: UserStats): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY(userId), JSON.stringify(data));
    memCache.set(userId, data);
  } catch {
    // silently ignore write errors
  }
}

// ── Warm memory cache from AsyncStorage (called once per session) ────────────

const warmed = new Set<string>();
async function warmMemCache(userId: string): Promise<void> {
  if (warmed.has(userId)) return;
  warmed.add(userId);
  const cached = await readCache(userId);
  if (cached && !memCache.has(userId)) {
    memCache.set(userId, cached);
  }
}

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ZERO_STATS: UserStats = {
  total_quizzes: 0,
  total_questions: 0,
  average_score: 0,
  best_score: 0,
  streak: 0,
  weekly_activity: DAYS.map((day) => ({ day, count: 0 })),
  subject_mastery: [],
  recent_results: [],
};

// ── Lecture name map ─────────────────────────────────────────────────────────

async function buildLectureNameMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("lectures").select("id, name");
  const map = new Map<string, string>();
  if (error || !data) return map;
  for (const row of data) {
    const r = row as Record<string, unknown>;
    const id = String(r.id ?? "");
    const name = String(r.name ?? "");
    if (id && name) map.set(id, name);
  }
  return map;
}

// ── Core computation ─────────────────────────────────────────────────────────

type RawRow = {
  id: string;
  user_id: string;
  lecture_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
};

function computeStats(rows: RawRow[], lectureMap: Map<string, string>, dbStats?: any): UserStats {
  if (!dbStats && rows.length === 0) return ZERO_STATS;

  const lectureName = (id: string) =>
    lectureMap.get(id) ?? `Lecture ${id.slice(0, 6)}…`;

  // Use DB stats if provided, otherwise fallback to computing from rows (useful for empty states)
  const total_quizzes = dbStats?.total_quizzes ?? 0;
  const total_questions = dbStats?.total_questions_answered ?? 0;
  const average_score = dbStats?.average_score ?? 0;
  const best_score = dbStats?.best_score ?? 0;
  const streak = dbStats?.current_streak ?? 0;

  // ── Weekly activity ───────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartMs = weekStart.getTime();

  const countByDay: Record<number, number> = {};
  rows.forEach((r) => {
    const d = new Date(r.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= weekStartMs) {
      const day = d.getDay();
      countByDay[day] = (countByDay[day] ?? 0) + 1;
    }
  });
  const todayDow = new Date().getDay();
  const weekly_activity = DAYS.map((day, i) => ({
    day,
    count: countByDay[i] ?? 0,
    isToday: i === todayDow,
  }));

  // Subject mastery
  const byLecture: Record<string, number[]> = {};
  rows.forEach((r) => {
    const key = r.lecture_id ?? "Unknown";
    if (!byLecture[key]) byLecture[key] = [];
    byLecture[key].push(r.score ?? 0);
  });
  const subject_mastery = Object.entries(byLecture)
    .map(([id, scores]) => ({
      subject: lectureName(id),
      mastery: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.mastery - a.mastery);

  // Recent results
  const recent_results = rows.slice(0, 10).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    lecture_id: r.lecture_id,
    lecture_name: lectureName(r.lecture_id),
    score: r.score ?? 0,
    total_questions: r.total_questions ?? 0,
    correct_answers: r.correct_answers ?? 0,
    created_at: r.created_at,
  }));

  return {
    total_quizzes,
    total_questions,
    average_score: Math.round(Number(average_score) || 0),
    best_score: Math.round(Number(best_score) || 0),
    streak,
    weekly_activity,
    subject_mastery,
    recent_results,
  };
}

// ── Offline path (shared) ────────────────────────────────────────────────────

async function serveFromCache(userId: string): Promise<UserStats> {
  const [cached, queue] = await Promise.all([
    readCache(userId),
    getQueue(),
  ]);
  const pending = queue.filter((q) => q.userId === userId);

  if (!cached && pending.length === 0) return ZERO_STATS;

  const base = cached ?? ZERO_STATS;

  // Update memCache with fresh cache read
  if (cached) memCache.set(userId, cached);

  if (pending.length === 0) return base;

  // Merge queued results into cached snapshot
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

  const mergedRows = [...syntheticRows, ...cachedRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 50);

  const localMap = new Map<string, string>();
  base.recent_results?.forEach((r) => localMap.set(r.lecture_id, r.lecture_name));

  const newTotalQuizzes = base.total_quizzes + pending.length;
  const syntheticDbStats = {
    total_quizzes: newTotalQuizzes,
    total_questions_answered: base.total_questions + pending.reduce((s, p) => s + (p.totalQuestions ?? 0), 0),
    average_score: newTotalQuizzes === 0 ? 0 : ((base.average_score * base.total_quizzes) + pending.reduce((s, p) => s + (p.score ?? 0), 0)) / newTotalQuizzes,
    best_score: Math.max(base.best_score, ...pending.map((p) => p.score ?? 0)),
    current_streak: base.streak, // Simplified offline fallback
  };

  return computeStats(mergedRows, localMap, syntheticDbStats);
}

// ── Fetch ────────────────────────────────────────────────────────────────────

async function fetchStats(userId: string): Promise<UserStats> {
  // ── Fast offline short-circuit ─────────────────────────────────────────
  // Check connectivity BEFORE attempting any network call.
  // This avoids waiting for Supabase's network timeout (can be 5-30s).
  const net = await NetInfo.fetch();
  const isOnline = (net.isConnected ?? false) && net.isInternetReachable !== false;

  if (!isOnline) {
    return serveFromCache(userId);
  }

  // ── Online path ────────────────────────────────────────────────────────
  let rows: RawRow[] = [];
  let lectureMap = new Map<string, string>();
  let dbStats: any = null;

  try {
    const [statsRes, quizRes, map] = await Promise.all([
      supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("quiz_results")
        .select("id, user_id, lecture_id, score, total_questions, correct_answers, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      buildLectureNameMap(),
    ]);

    if (quizRes.error) throw quizRes.error;
    rows = (quizRes.data ?? []) as RawRow[];
    lectureMap = map;
    dbStats = statsRes.data;
  } catch {
    // Network error mid-request — fall back to cache
    return serveFromCache(userId);
  }

  // Merge still-queued items (submitted but not yet synced)
  const queue = await getQueue();
  const pending = queue.filter((q) => q.userId === userId);

  if (pending.length > 0) {
    const syntheticRows: RawRow[] = pending.map((q) => ({
      id: q.localId,
      user_id: q.userId,
      lecture_id: q.lectureId,
      score: q.score,
      total_questions: q.totalQuestions,
      correct_answers: q.correctAnswers,
      created_at: q.createdAt,
    }));
    rows = [...syntheticRows, ...rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 50);

    const newTotalQuizzes = (dbStats?.total_quizzes ?? 0) + pending.length;
    dbStats = {
      total_quizzes: newTotalQuizzes,
      total_questions_answered: (dbStats?.total_questions_answered ?? 0) + pending.reduce((s, p) => s + (p.totalQuestions ?? 0), 0),
      average_score: newTotalQuizzes === 0 ? 0 : (((dbStats?.average_score ?? 0) * (dbStats?.total_quizzes ?? 0)) + pending.reduce((s, p) => s + (p.score ?? 0), 0)) / newTotalQuizzes,
      best_score: Math.max(dbStats?.best_score ?? 0, ...pending.map((p) => p.score ?? 0)),
      current_streak: dbStats?.current_streak ?? 0,
    };
  }

  const result = computeStats(rows, lectureMap, dbStats);

  // Persist for offline use (also updates memCache)
  writeCache(userId, result);
  return result;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Force clear all stats cache for a user (used during 'Clear History').
 */
export async function clearStatsCache(userId: string) {
  try {
    await AsyncStorage.removeItem(CACHE_KEY(userId));
    memCache.delete(userId);
    warmed.delete(userId);
  } catch (error) {
    console.error("[clearStatsCache] Error clearing stats cache:", error);
  }
}

export function useStats(userId: string | undefined) {
  // Kick off async warm of memCache on first call for this user.
  // By the time they navigate to the stats tab, memCache will be populated.
  if (userId && !warmed.has(userId)) {
    warmMemCache(userId);
  }

  const memData = userId ? memCache.get(userId) : undefined;

  return useQuery({
    queryKey: ["stats", userId],
    queryFn: () => fetchStats(userId!),
    enabled: !!userId,
    // Serve last-known data synchronously — no loading spinner on re-visits
    initialData: memData,
    // Treat initialData as stale so a background refresh still runs
    initialDataUpdatedAt: memData ? Date.now() - 1000 * 60 * 11 : undefined,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });
}
