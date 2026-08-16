/**
 * @file cacheUtils.ts
 * @description Centralized utility functions for clearing and managing application-wide caches.
 *
 * Phase B (plan.md §9): `clearAllUserCaches` deletes every user-scoped row from
 * SQLite (`DELETE … WHERE user_id` across all tables) plus the legacy
 * AsyncStorage keys. MMKV global keys are untouched — they are not user-scoped.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearQueueForUser } from "@/src/shared/services/offlineQueue";
import { getDb } from "@/src/db/client";

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
  // boot) this is skipped but the legacy cleanup below still runs.
  try {
    const db = await getDb();
    await db.$client.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("DELETE FROM progress WHERE user_id = ?", userId);
      await txn.runAsync("DELETE FROM best_scores WHERE user_id = ?", userId);
      await txn.runAsync("DELETE FROM user_stats WHERE user_id = ?", userId);
      await txn.runAsync("DELETE FROM access_map WHERE user_id = ?", userId);
      await txn.runAsync("DELETE FROM purchases WHERE user_id = ?", userId);
      await txn.runAsync("DELETE FROM quiz_results WHERE user_id = ?", userId);
    });
  } catch (error) {
    if (__DEV__) {
      console.warn("[clearAllUserCaches] Error clearing SQLite caches:", error);
    }
  }

  try {
    await clearQueueForUser(userId);

    // Legacy AsyncStorage keys (still present until Phase D).
    await AsyncStorage.multiRemove([
      `harvi:progress:${userId}`,
      `harvi:bestScores:${userId}`,
      `harvi:stats:${userId}`,
      `harvi:access:${userId}`,
      `harvi:purchases:${userId}`,
    ]);
  } catch (error) {
    if (__DEV__) {
      console.warn("[clearAllUserCaches] Error clearing caches:", error);
    }
  }
}