/**
 * @file cacheUtils.ts
 * @description Centralized utility functions for clearing and managing application-wide caches.
 *
 * Phase B (plan.md §9): `clearAllUserCaches` deletes every user-scoped row from
 * SQLite (`DELETE … WHERE user_id` across all tables) plus the offline queue.
 * MMKV global keys are untouched — they are not user-scoped.
 */
import { clearQueueForUser } from "@/src/shared/services/offlineQueue";
import { getDb } from "@/src/db/client";
import { clearAllUserCacheRows } from "@/src/db/cacheTransactions";

/**
 * Clears all user-scoped persistent caches and purges pending queue entries.
 *
 * Should be invoked during user sign-out to prevent data leaks across user
 * sessions on shared mobile devices and to ensure clean state hydration on
 * next login.
 *
 * @param userId - The ID of the authenticated user whose caches should be purged
 * @returns A Promise resolving when all rows and offline queue entries are deleted
 */
export async function clearAllUserCaches(userId: string): Promise<void> {
  // SQLite rows — best-effort; if the DB isn't open yet (e.g. logout during
  // boot) this is skipped but the queue cleanup below still runs.
  try {
    const db = await getDb();
    await clearAllUserCacheRows(db, userId);
  } catch (error) {
    if (__DEV__) {
      console.warn("[clearAllUserCaches] Error clearing SQLite caches:", error);
    }
  }

  try {
    await clearQueueForUser(userId);
  } catch (error) {
    if (__DEV__) {
      console.warn("[clearAllUserCaches] Error clearing caches:", error);
    }
  }
}