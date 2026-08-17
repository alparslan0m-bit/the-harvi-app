/**
 * bestScoreService — fetches the best quiz score (%) per lecture.
 *
 * Offline-first (same pattern as progressService):
 *  - Module-level memCache gives synchronous initialData on every mount
 *  - NetInfo check skips Supabase entirely when offline (no timeout wait)
 *  - On success   → writes to SQLite + memCache, merges queued scores
 *  - On net error → serves last SQLite snapshot + queued offline scores
 *
 * Phase B (plan.md §9): disk cache is the `best_scores` table.
 */
import NetInfo from "@react-native-community/netinfo";

import { getQueueForUser } from "@/src/shared/services/offlineQueue";
import { supabase } from "@/src/shared/services/supabase";
import { isDeviceOnline } from "@/src/shared/utils/netInfo";
import { Database, getDb } from "@/src/db/client";
import { bestScores } from "@/src/db/schema";
import { replaceBestScoresCache } from "@/src/db/cacheTransactions";
import { eq, sql } from "drizzle-orm";

// ── Constants ────────────────────────────────────────────────────────────────

/** Map<lectureId, bestScorePercent> */
export type BestScoreMap = Map<string, number>;

// ── Disk helpers (SQLite canonical) ──────────────────────────────────────────

export function readCacheSync(db: Database, userId: string): BestScoreMap | undefined {
  try {
    const rows = db.$client.getAllSync<{
      lecture_id: string;
      score: number;
    }>("SELECT lecture_id, score FROM best_scores WHERE user_id = ?", userId);
    if (rows.length === 0) return undefined;
    return new Map(rows.map((r) => [r.lecture_id, r.score]));
  } catch (e) {
    if (__DEV__) console.warn("[bestScoreService] readCacheSync error:", e);
    return undefined;
  }
}

async function readCache(userId: string): Promise<BestScoreMap | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select({ lectureId: bestScores.lectureId, score: bestScores.score })
      .from(bestScores)
      .where(eq(bestScores.userId, userId));
    if (rows.length === 0) return null;
    return new Map(rows.map((r) => [r.lectureId, r.score]));
  } catch (e) {
    if (__DEV__) console.warn("[bestScoreService] readCache error:", e);
    return null;
  }
}

export async function writeCache(
  userId: string,
  data: BestScoreMap,
): Promise<void> {
  try {
    const db = await getDb();
    await replaceBestScoresCache(db, userId, data);
  } catch (e) {
    if (__DEV__) console.warn("[bestScoreService] writeCache error:", e);
  }
}

/**
 * Merge a newly-completed quiz score into the on-device bestScore cache
 * so the lecture card stars update instantly after a quiz finishes —
 * even before the result is synced to Supabase.
 *
 * Single atomic upsert (INSERT … ON CONFLICT DO UPDATE): no read-modify-write
 * race window vs a concurrent `fetchBestScores.writeCache` (audit P2-11).
 */
export async function optimisticallyUpdateBestScore(
  userId: string,
  lectureId: string,
  score: number,
): Promise<void> {
  try {
    const db = await getDb();
    await db
      .insert(bestScores)
      .values({ userId, lectureId, score })
      .onConflictDoUpdate({
        target: [bestScores.userId, bestScores.lectureId],
        set: { score: sql`max(${bestScores.score}, excluded.score)` },
      });
  } catch (e) {
    if (__DEV__) console.warn("[bestScoreService] optimistic update error:", e);
  }
}

// ── Merge queued offline results into a score map ────────────────────────────

async function mergeQueuedScores(
  userId: string,
  base: BestScoreMap,
): Promise<BestScoreMap> {
  const pending = await getQueueForUser(userId);
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
  const cached = (await readCache(userId)) ?? new Map<string, number>();
  return mergeQueuedScores(userId, cached);
}

// ── Online fetch ─────────────────────────────────────────────────────────────

export async function fetchBestScores(userId: string): Promise<BestScoreMap> {
  // Fast offline short-circuit
  const net = await NetInfo.fetch();
  const isOnline = isDeviceOnline(net);

  if (!isOnline) {
    return serveFromCache(userId);
  }

  try {
    const queryPromise = supabase
      .from("quiz_results")
      .select("lecture_id, score")
      .eq("user_id", userId);

    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 10000),
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

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
    if (__DEV__) console.warn("[bestScoreService] fetchBestScores error:", e);
    return serveFromCache(userId);
  }
}

