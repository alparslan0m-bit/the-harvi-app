// Extracted from hooks/useStats.ts — data fetching, caching, and computation.

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { getQueue } from "@/src/shared/services/offlineQueue";
import { supabase } from "@/src/shared/services/supabase";
import { UserStats, UserStatsSchema } from "@/src/shared/types/schemas";
import { useCacheStore } from "@/src/shared/store/cacheStore";
import { fetchHierarchy } from "@/src/features/learn/services/hierarchyService";

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = (uid: string) => `harvi:stats:${uid}`;
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

// ── Types ────────────────────────────────────────────────────────────────────

type RawRow = {
  id: string;
  user_id: string;
  lecture_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
};

export interface DbStats {
  total_quizzes?: number | null;
  total_questions_answered?: number | null;
  average_score?: number | null;
  best_score?: number | null;
  current_streak?: number | null;
  last_quiz_date?: string | null;
}

// ── AsyncStorage helpers ─────────────────────────────────────────────────────

async function readCache(userId: string): Promise<UserStats | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(userId));
    if (!raw) return null;
    const result = UserStatsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch (e) {
    if (__DEV__) console.warn('[statsService] Error reading cache:', e);
    return null;
  }
}

async function writeCache(userId: string, data: UserStats): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY(userId), JSON.stringify(data));
    useCacheStore.getState().setStatsCache(userId, data);
  } catch (e) {
    if (__DEV__) console.warn('[statsService] Error writing cache:', e);
  }
}

// ── Warm memory cache from AsyncStorage (called once per session) ────────────

export async function warmMemCache(userId: string): Promise<void> {
  const { warmedStats, statsCache, setWarmed, setStatsCache } = useCacheStore.getState();
  if (warmedStats.has(userId)) return;
  setWarmed(userId);
  const cached = await readCache(userId);
  if (cached && !statsCache.has(userId)) {
    setStatsCache(userId, cached);
  }
}

// ── Lecture name map ─────────────────────────────────────────────────────────

async function buildLectureNameMap(): Promise<Map<string, string>> {
  const queryPromise = supabase.from("lectures").select("id, name");
  const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 10000)
  );

  let data, error;
  try {
    const result = await Promise.race([queryPromise, timeoutPromise]);
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e;
  }

  const map = new Map<string, string>();
  if (error || !data) return map;
  for (const row of data) {
    const r = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {};
    const id = String(r["id"] ?? "");
    const name = String(r["name"] ?? "");
    if (id && name) map.set(id, name);
  }
  return map;
}

// ── Shared Stats Helpers ─────────────────────────────────────────────────────

function mapRpcToUserStats(rpcData: any, dbStats: DbStats | null): UserStats {
  const total_quizzes = dbStats?.total_quizzes ?? 0;
  const total_questions = dbStats?.total_questions_answered ?? 0;
  const average_score = dbStats?.average_score ?? 0;
  const best_score = dbStats?.best_score ?? 0;

  let streak = dbStats?.current_streak ?? 0;
  if (streak > 0 && dbStats?.last_quiz_date) {
    const lastQuiz = new Date(dbStats.last_quiz_date + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - lastQuiz.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) streak = 0;
  }

  const todayDow = new Date().getDay();
  const todayIndex = (todayDow + 1) % 7; // Map 0-6 (Sun-Sat) to index where Sat is 0
  const weeklyMap = new Map<number, number>(
    (rpcData?.weekly_activity ?? []).map((w: any) => {
      const index = (w.dow + 1) % 7;
      return [index, w.count];
    })
  );
  
  const weekly_activity = DAYS.map((day, i) => ({
    day,
    count: weeklyMap.get(i) ?? 0,
    isToday: i === todayIndex,
  }));

  const subject_mastery = (rpcData?.subject_mastery ?? []).map((m: any) => ({
    subject: m.subject ?? "Unknown",
    mastery: m.mastery ?? 0,
    attempts: m.attempts ?? 0,
  }));

  const recent_results = (rpcData?.recent_results ?? []).map((r: any) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    lecture_id: String(r.lecture_id),
    lecture_name: String(r.lecture_name ?? `Lecture ${String(r.lecture_id).slice(0, 6)}…`),
    score: Number(r.score ?? 0),
    total_questions: Number(r.total_questions ?? 0),
    correct_answers: Number(r.correct_answers ?? 0),
    created_at: String(r.created_at),
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

function applyPendingStats(base: UserStats, pending: any[], localMap: Map<string, string>): UserStats {
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
  ).slice(0, 10);

  const newTotalQuizzes = base.total_quizzes + pending.length;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  const dow = weekStart.getDay();
  const daysSinceSaturday = (dow + 1) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceSaturday);
  const weekStartMs = weekStart.getTime();

  const weekly_activity = base.weekly_activity.map(a => ({ ...a }));
  pending.forEach(q => {
    const d = new Date(q.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= weekStartMs) {
      const qDow = d.getDay();
      const index = (qDow + 1) % 7;
      const entry = weekly_activity[index];
      if (entry) entry.count++;
    }
  });

  const masteryMap = new Map<string, { subject: string, totalScore: number, attempts: number }>();
  base.subject_mastery.forEach(m => {
    masteryMap.set(m.subject, { ...m, totalScore: m.mastery * m.attempts });
  });

  pending.forEach(q => {
    const subjName = localMap.get(q.lectureId) ?? `Lecture ${q.lectureId.slice(0, 6)}…`;
    const existing = masteryMap.get(subjName) ?? { subject: subjName, totalScore: 0, attempts: 0 };
    existing.totalScore += q.score;
    existing.attempts += 1;
    masteryMap.set(subjName, existing);
  });

  const subject_mastery = Array.from(masteryMap.values()).map(m => ({
    subject: m.subject,
    mastery: Math.round(m.totalScore / m.attempts),
    attempts: m.attempts
  })).sort((a, b) => b.mastery - a.mastery);

  const recent_results = mergedRows.map(r => ({
    id: r.id,
    user_id: r.user_id,
    lecture_id: r.lecture_id,
    lecture_name: localMap.get(r.lecture_id) ?? `Lecture ${r.lecture_id.slice(0, 6)}…`,
    score: r.score ?? 0,
    total_questions: r.total_questions ?? 0,
    correct_answers: r.correct_answers ?? 0,
    created_at: r.created_at,
  }));

  return {
    total_quizzes: newTotalQuizzes,
    total_questions: base.total_questions + pending.reduce((s, p) => s + (p.totalQuestions ?? 0), 0),
    average_score: newTotalQuizzes === 0 ? 0 : Math.round(((base.average_score * base.total_quizzes) + pending.reduce((s, p) => s + (p.score ?? 0), 0)) / newTotalQuizzes),
    best_score: Math.max(base.best_score, ...pending.map(p => p.score ?? 0)),
    streak: base.streak,
    weekly_activity,
    subject_mastery,
    recent_results
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

  if (cached) useCacheStore.getState().setStatsCache(userId, cached);

  if (pending.length === 0) return base;

  const localMap = new Map<string, string>();
  base.recent_results?.forEach((r) => localMap.set(r.lecture_id, r.lecture_name));

  try {
    const hierarchy = await fetchHierarchy();
    hierarchy.forEach((year) =>
      year.modules.forEach((mod) =>
        mod.subjects.forEach((sub) =>
          sub.lectures.forEach((lec) => localMap.set(lec.id, lec.name))
        )
      )
    );
  } catch (e) {
    // Ignore if hierarchy cache is missing
  }

  return applyPendingStats(base, pending, localMap);
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchStats(userId: string): Promise<UserStats> {
  const net = await NetInfo.fetch();
  const isOnline = (net.isConnected ?? false) && net.isInternetReachable !== false;

  if (!isOnline) {
    return serveFromCache(userId);
  }

  let dbStats: DbStats | null = null;
  let rpcData: any = null;

  try {
    const statsQuery = supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
      
    const rpcQuery = supabase
      .rpc("get_user_stats_overview", { p_user_id: userId });

    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 10000)
    );

    const [statsRes, rpcRes] = await Promise.race([
      Promise.all([statsQuery, rpcQuery]),
      timeoutPromise
    ]);

    if (rpcRes.error) throw rpcRes.error;
    
    dbStats = statsRes.data;
    rpcData = rpcRes.data;
  } catch (e) {
    if (__DEV__) console.warn('[statsService] Network error mid-request:', e);
    return serveFromCache(userId);
  }

  const baseResult = mapRpcToUserStats(rpcData, dbStats);

  const queue = await getQueue();
  let pending = queue.filter((q) => q.userId === userId);

  // Prevent double-counting: if the server already processed this quiz (but the client timed out and queued it),
  // it will be in the server's recent_results. We filter it out so we don't add its stats twice.
  const serverIds = new Set(baseResult.recent_results?.map(r => r.id) ?? []);
  pending = pending.filter(q => !serverIds.has(q.localId));

  let finalResult = baseResult;
  if (pending.length > 0) {
    const localMap = await buildLectureNameMap();
    finalResult = applyPendingStats(baseResult, pending, localMap);
  }

  writeCache(userId, finalResult);
  return finalResult;
}

// ── Cache management ─────────────────────────────────────────────────────────

export async function clearStatsCache(userId: string) {
  try {
    await AsyncStorage.removeItem(CACHE_KEY(userId));
    useCacheStore.getState().clearStatsCacheForUser(userId);
  } catch (error) {
    if (__DEV__) console.error("[clearStatsCache] Error clearing stats cache:", error);
  }
}
