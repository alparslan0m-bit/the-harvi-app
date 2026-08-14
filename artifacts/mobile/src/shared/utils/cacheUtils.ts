/**
 * @file cacheUtils.ts
 * @description Centralized utility functions for clearing and managing application-wide caches.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearQueueForUser } from "@/src/shared/services/offlineQueue";

/**
 * Clears all user-scoped persistent caches stored in AsyncStorage and purges pending queue entries.
 * 
 * Should be invoked during user sign-out to prevent data leaks across user sessions 
 * on shared mobile devices and to ensure clean state hydration on next login.
 * 
 * @param userId - The ID of the authenticated user whose caches should be purged
 * @returns A Promise resolving when all keys and offline queue entries are deleted
 */
export async function clearAllUserCaches(userId: string): Promise<void> {
  try {
    const keys = [
      `harvi:progress:${userId}`,
      `harvi:bestScores:${userId}`,
      `harvi:stats:${userId}`,
      `harvi:access:${userId}`,
      `harvi:purchases:${userId}`,
    ];
    await AsyncStorage.multiRemove(keys);
    await clearQueueForUser(userId);
  } catch (error) {
    if (__DEV__) {
      console.warn("[clearAllUserCaches] Error clearing caches:", error);
    }
  }
}
