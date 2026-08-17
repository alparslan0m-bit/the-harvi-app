/**
 * @file progressService.ts
 * @description Manages fetching, caching, and merging of user progress (completed lectures).
 * Seamlessly merges data from three sources: the Supabase backend, the local SQLite cache,
 * and the offline sync queue to provide immediate, optimistic UI updates without waiting for network.
 *
 * Phase B (plan.md §9): disk cache is the `progress` table via the async db client.
 */
import NetInfo from "@react-native-community/netinfo";

import { getQueueForUser } from "@/src/shared/services/offlineQueue";
import { supabase } from "@/src/shared/services/supabase";
import { isDeviceOnline } from "@/src/shared/utils/netInfo";
import { getDb } from "@/src/db/client";

// ── Module-level memory cache (survives re-renders, cleared on app restart) ──

/**
 * Fast, synchronous memory cache of completed lecture IDs per user.
 * Avoids the async overhead of reading from disk on every UI render.
 */
export const memCache = new Map<string, Set<string>>();
export const warmed = new Set<string>();

// ── Disk helpers (SQLite canonical) ──────────────────────────────────────────

async function readCache(userId: string): Promise<Set<string> | null> {
  try {
    const db = await getDb();
    const rows = await db.$client.getAllAsync<{ lecture_id: string }>(
      "SELECT lecture_id FROM progress WHERE user_id = ?",
      userId,
    );
    return new Set(rows.map((r) => r.lecture_id));
  } catch (e) {
    if (__DEV__) console.warn("[progressService] readCache error:", e);
    return null;
  }
}

/**
 * Writes the completed-IDs set to SQLite (replace-in-transaction) and updates
 * memCache.
 *
 * @param userId - The ID of the authenticated user
 * @param ids - A Set of completed lecture string IDs
 */
export async function writeProgressCache(
  userId: string,
  ids: Set<string>,
): Promise<void> {
  try {
    const db = await getDb();
    const completedAt = new Date().toISOString();
    await db.$client.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("DELETE FROM progress WHERE user_id = ?", userId);
      for (const lectureId of ids) {
        await txn.runAsync(
          "INSERT INTO progress (user_id, lecture_id, completed_at) VALUES (?, ?, ?)",
          userId,
          lectureId,
          completedAt,
        );
      }
    });
    memCache.set(userId, ids);
  } catch (e) {
    if (__DEV__) console.warn("[progressService] writeProgressCache error:", e);
  }
}

/**
 * Optimistically merges a newly-completed lecture into the on-device progress cache.
 * 
 * This allows the UI (like a lecture card) to flip to a "done" state the instant a quiz finishes —
 * even before the result is uploaded to Supabase or placed in the offline queue.
 * 
 * @param userId - The ID of the authenticated user
 * @param lectureId - The ID of the newly completed lecture
 */
export async function optimisticallyMarkComplete(
  userId: string,
  lectureId: string,
): Promise<void> {
  const current =
    memCache.get(userId) ?? (await readCache(userId)) ?? new Set<string>();
  current.add(lectureId);
  await writeProgressCache(userId, current);
}

// ── Warm memory cache from SQLite (called once per session) ──────────────────

/**
 * Warms the synchronous memory cache by pulling the persisted dataset from SQLite.
 * Typically called once per session during application bootstrap or user login.
 * 
 * @param userId - The ID of the authenticated user
 */
export async function warmMemCache(userId: string): Promise<void> {
  if (warmed.has(userId)) return;
  warmed.add(userId);
  const cached = await readCache(userId);
  if (cached && !memCache.has(userId)) {
    memCache.set(userId, cached);
  }
}

// ── Queue helpers ────────────────────────────────────────────────────────────

async function queuedIds(userId: string): Promise<string[]> {
  const queue = await getQueueForUser(userId);
  return queue.map((q) => q.lectureId);
}

// ── Offline path ─────────────────────────────────────────────────────────────

async function serveFromCache(userId: string): Promise<Set<string>> {
  const cached =
    memCache.get(userId) ?? (await readCache(userId)) ?? new Set<string>();
  const pending = await queuedIds(userId);
  pending.forEach((id) => cached.add(id));
  // Keep memCache in sync
  memCache.set(userId, cached);
  return cached;
}

// ── Online fetch ─────────────────────────────────────────────────────────────

/**
 * Fetches the user's completed lectures from Supabase.
 * 
 * Implements an aggressive offline-first strategy:
 * 1. Explicitly checks connectivity using `NetInfo` before attempting a network request.
 * 2. On a network timeout or failure, seamlessly falls back to the local cache.
 * 3. Merges any pending offline queue items into the final result so the user's view of progress is always accurate.
 * 
 * @param userId - The ID of the authenticated user
 * @returns A Set of completed lecture IDs
 */
export async function fetchCompletedLectures(
  userId: string,
): Promise<Set<string>> {
  // ── Fast offline short-circuit ───────────────────────────────────────────
  // Check connectivity BEFORE any Supabase call.
  // Without this, an offline app waits up to 30 s for the request to fail.
  const net = await NetInfo.fetch();
  const isOnline = isDeviceOnline(net);

  if (!isOnline) {
    return serveFromCache(userId);
  }

  // ── Online path ──────────────────────────────────────────────────────────
  let result: Set<string> | null = null;

  try {
    const queryPromise = supabase
      .from("quiz_results")
      .select("lecture_id")
      .eq("user_id", userId);

    const timeoutPromise = new Promise<{ data: any; error: any }>(
      (_, reject) => setTimeout(() => reject(new Error("timeout")), 10000),
    );

    let data, error;
    try {
      const resp = await Promise.race([queryPromise, timeoutPromise]);
      data = resp.data;
      error = resp.error;
    } catch (e) {
      error = e;
    }

    if (error) {
      if (error instanceof Error && error.message === "timeout") throw error;
      throw error;
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const ids = data
        .filter(
          (r: unknown): r is Record<string, unknown> =>
            typeof r === "object" && r !== null,
        )
        .map((r) => r["lecture_id"])
        .filter(
          (v): v is string | number =>
            v != null && String(v) !== "null" && String(v).length > 0,
        )
        .map((v) => String(v));

      result = new Set(ids);
    } else {
      result = new Set<string>();
    }
  } catch (e) {
    if (__DEV__)
      console.warn("[progressService] fetchCompletedLectures error:", e);
    // Network error mid-request — fall back to cache
    return serveFromCache(userId);
  }

  // Merge still-queued IDs (submitted offline, not yet synced)
  const pending = await queuedIds(userId);
  pending.forEach((id) => {
    if (result) result.add(id);
  });

  // Persist for offline use + update memCache
  await writeProgressCache(userId, result);
  return result;
}

// ── Cache management ─────────────────────────────────────────────────────────

/**
 * Purges all progress caches for a specific user from SQLite and memory.
 * Invoked during destructive actions like user logout or manual cache clearing.
 *
 * @param userId - The ID of the authenticated user
 */
export async function clearProgressCache(userId: string) {
  try {
    await (await getDb()).$client.runAsync(
      "DELETE FROM progress WHERE user_id = ?",
      userId,
    );
    memCache.delete(userId);
    warmed.delete(userId);
  } catch (error) {
    if (__DEV__)
      console.error(
        "[clearProgressCache] Error clearing progress cache:",
        error,
      );
  }
}
