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
import { Database, getDb } from "@/src/db/client";
import { progress } from "@/src/db/schema";
import { replaceProgressCache } from "@/src/db/cacheTransactions";
import { eq } from "drizzle-orm";

// ── Disk helpers (SQLite canonical) ──────────────────────────────────────────

/**
 * Synchronous read for React Query initialData to avoid loading flashes.
 */
export function readCacheSync(db: Database, userId: string): Set<string> | undefined {
  try {
    const rows = db.$client.getAllSync<{ lecture_id: string }>(
      "SELECT lecture_id FROM progress WHERE user_id = ?",
      userId,
    );
    return new Set(rows.map((r) => r.lecture_id));
  } catch (e) {
    if (__DEV__) console.warn("[progressService] readCacheSync error:", e);
    return undefined;
  }
}


async function readCache(userId: string): Promise<Set<string> | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select({ lectureId: progress.lectureId })
      .from(progress)
      .where(eq(progress.userId, userId));
    return new Set(rows.map((r) => r.lectureId));
  } catch (e) {
    if (__DEV__) console.warn("[progressService] readCache error:", e);
    return null;
  }
}

/**
 * Writes the completed-IDs set to SQLite (replace-in-transaction) and updates
 * memCache. Each lecture keeps its real completion timestamp from the server
 * instead of one shared write time (audit P3-10).
 *
 * @param userId - The ID of the authenticated user
 * @param completedByLecture - Map of lectureId → ISO completion timestamp
 */
export async function writeProgressCache(
  userId: string,
  completedByLecture: ReadonlyMap<string, string>,
): Promise<void> {
  try {
    const db = await getDb();
    await replaceProgressCache(db, userId, completedByLecture);
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
  try {
    const db = await getDb();
    await db.insert(progress).values({
      userId,
      lectureId,
      completedAt: new Date().toISOString(),
    }).onConflictDoNothing();
  } catch (e) {
    if (__DEV__) console.warn("[progressService] optimisticallyMarkComplete error:", e);
  }
}

// ── Queue helpers ────────────────────────────────────────────────────────────

async function queuedIds(userId: string): Promise<string[]> {
  const queue = await getQueueForUser(userId);
  return queue.map((q) => q.lectureId);
}

// ── Offline path ─────────────────────────────────────────────────────────────

async function serveFromCache(userId: string): Promise<Set<string>> {
  const cached = (await readCache(userId)) ?? new Set<string>();
  const pending = await queuedIds(userId);
  pending.forEach((id) => cached.add(id));
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
  const completedByLecture = new Map<string, string>();

  try {
    const queryPromise = supabase
      .from("quiz_results")
      .select("lecture_id, created_at")
      .eq("user_id", userId);

    const timeoutPromise = new Promise<{ data: unknown; error: unknown }>(
      (_, reject) => setTimeout(() => reject(new Error("timeout")), 10000),
    );

    let data: unknown;
    let error: unknown;
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
        .map((r) => {
          const lectureId = r["lecture_id"];
          const createdAt = r["created_at"];
          if (
            lectureId != null &&
            String(lectureId) !== "null" &&
            String(lectureId).length > 0
          ) {
            const id = String(lectureId);
            const ts = createdAt != null ? String(createdAt) : "";
            const existing = completedByLecture.get(id);
            // Keep the LATEST completion timestamp per lecture.
            if (!existing || ts > existing) {
              completedByLecture.set(id, ts);
            }
            return id;
          }
          return null;
        })
        .filter((v): v is string => v !== null);

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
  // Queued items have no server timestamp yet — stamp them with their own
  // created_at so completed_at stays meaningful even before sync (audit P3-10).
  const pendingRows = await getQueueForUser(userId);
  pendingRows.forEach((p) => {
    const existing = completedByLecture.get(p.lectureId);
    if (!existing || p.createdAt > existing) {
      completedByLecture.set(p.lectureId, p.createdAt);
    }
  });

  // Persist for offline use + update memCache
  await writeProgressCache(userId, completedByLecture);
  return result;
}

