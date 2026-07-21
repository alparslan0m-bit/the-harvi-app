/**
 * bestScoreService — fetches the best quiz score (%) per lecture.
 *
 * Offline-first (same pattern as progressService):
 *  - Module-level memCache gives synchronous initialData on every mount
 *  - NetInfo check skips Supabase entirely when offline (no timeout wait)
 *  - On success   → writes to AsyncStorage + memCache, merges queued scores
 *  - On net error → serves last AsyncStorage snapshot + queued offline scores
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { z } from "zod";

import { getQueue } from "@/src/shared/services/offlineQueue";
import { supabase } from "@/src/shared/services/supabase";

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = (uid: string) => `harvi:bestScores:${uid}`;

/** Map<lectureId, bestScorePercent> */
export type BestScoreMap = Map<string, number>;

// ── Module-level memory cache ────────────────────────────────────────────────

export const memCache = new Map<string, BestScoreMap>();
export const warmed = new Set<string>();

// ── AsyncStorage helpers ─────────────────────────────────────────────────────

const CacheSchema = z.array(z.tuple([z.string(), z.number()]));

async function readCache(userId: string): Promise<BestScoreMap | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(userId));
    if (!raw) return null;
    const result = CacheSchema.safeParse(JSON.parse(raw));
    if (result.success) return new Map(result.data);
    return null;
  } catch (e) {
    if (__DEV__) console.warn("[bestScoreService] readCache error:", e);
    return null;
  }
}

export async function writeCache(userId: string, data: BestScoreMap): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY(userId),
      JSON.stringify([...data.entries()])
    );
    memCache.set(userId, data);
  } catch (e) {
    if (__DEV__) console.warn("[bestScoreService] writeCache error:", e);
  }
}

// ── Warm memory cache from AsyncStorage (called once per session) ────────────

export async function warmMemCache(userId: string): Promise<void> {
  if (warmed.has(userId)) return;
  warmed.add(userId);
  const cached = await readCache(userId);
  if (cached && !memCache.has(userId)) {
    memCache.set(userId, cached);
  }
}

/**
 * Merge a newly-completed quiz score into the on-device bestScore cache
 * so the lecture card stars update instantly after a quiz finishes —
 * even before the result is synced to Supabase.
 */
export async function optimisticallyUpdateBestScore(
  userId: string,
  lectureId: string,
  score: number
): Promise<void> {
  const current =
    memCache.get(userId) ?? (await readCache(userId)) ?? new Map<string, number>();
  const prevScore = current.get(lectureId) ?? 0;
  if (score > prevScore) {
    current.set(lectureId, score);
    await writeCache(userId, current);
  }
}

// ── Merge queued offline results into a score map ────────────────────────────

async function mergeQueuedScores(
  userId: string,
  base: BestScoreMap
): Promise<BestScoreMap> {
  const queue = await getQueue();
  const pending = queue.filter((q) => q.userId === userId);
  if (pending.length === 0) return base;

  const merged = new Map(base);
  for (const item of pending) {
    const current = merged.get(item.lectureId) ?? 0;
    if (item.score > current) {
      merged.set(item.lectureId, item.score);
    }
  }
  return merged;
}

// ── Offline path ─────────────────────────────────────────────────────────────

async function serveFromCache(userId: string): Promise<BestScoreMap> {
  const cached =
    memCache.get(userId) ?? (await readCache(userId)) ?? new Map<string, number>();
  const merged = await mergeQueuedScores(userId, cached);
  memCache.set(userId, merged);
  return merged;
}

// ── Online fetch ─────────────────────────────────────────────────────────────

export async function fetchBestScores(userId: string): Promise<BestScoreMap> {
  // Fast offline short-circuit
  const net = await NetInfo.fetch();
  const isOnline =
    (net.isConnected ?? false) && net.isInternetReachable !== false;

  if (!isOnline) {
    return serveFromCache(userId);
  }

  try {
    const { data, error } = await supabase
      .from("quiz_results")
      .select("lecture_id, score")
      .eq("user_id", userId);

    if (error) throw error;

    const scoreMap = new Map<string, number>();
    if (data && Array.isArray(data)) {
      for (const row of data) {
        const rec =
          typeof row === "object" && row !== null
            ? (row as Record<string, unknown>)
            : {};
        const lectureId = String(rec["lecture_id"] ?? "");
        const score = Number(rec["score"] ?? 0);
        if (!lectureId || Number.isNaN(score)) continue;
        const current = scoreMap.get(lectureId) ?? 0;
        if (score > current) {
          scoreMap.set(lectureId, score);
        }
      }
    }

    // Merge queued offline results
    const merged = await mergeQueuedScores(userId, scoreMap);

    // Persist for offline use
    await writeCache(userId, merged);
    return merged;
  } catch (e) {
    if (__DEV__)
      console.warn("[bestScoreService] fetchBestScores error:", e);
    return serveFromCache(userId);
  }
}

// ── Cache management ─────────────────────────────────────────────────────────

export async function clearBestScoreCache(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY(userId));
    memCache.delete(userId);
    warmed.delete(userId);
  } catch (e) {
    if (__DEV__)
      console.error("[bestScoreService] clearBestScoreCache error:", e);
  }
}
