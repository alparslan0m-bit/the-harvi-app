import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearQueueForUser } from "@/src/shared/services/offlineQueue";

/**
 * Clears all user-scoped persistent caches in AsyncStorage.
 * Call this during sign-out to prevent storage leaks and stale data
 * if another user signs in on the same device.
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
