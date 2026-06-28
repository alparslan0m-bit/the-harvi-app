/**
 * Offline quiz-result queue.
 * When a quiz finishes without network connectivity the result is enqueued
 * here (AsyncStorage).  SyncContext drains the queue as soon as the device
 * comes back online.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PendingQuizResult, PendingQuizResultSchema } from "@/types";
import { z } from "zod";

const QUEUE_KEY = "harvi:quiz_queue";

async function readQueue(): Promise<PendingQuizResult[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const result = z.array(PendingQuizResultSchema).safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingQuizResult[]): Promise<void> {
  const payload = JSON.stringify(queue);
  try {
    await AsyncStorage.setItem(QUEUE_KEY, payload);
  } catch (firstErr) {
    // Retry once — transient I/O errors are common on mobile
    try {
      await AsyncStorage.setItem(QUEUE_KEY, payload);
    } catch (retryErr) {
      console.error("[offlineQueue] CRITICAL: Failed to persist quiz result after retry", retryErr);
      throw retryErr; // Let caller handle (show user notification)
    }
  }
}

export async function enqueueQuizResult(
  item: Omit<PendingQuizResult, "localId">
): Promise<void> {
  const queue = await readQueue();
  queue.push({ ...item, localId: `${Date.now()}-${Math.random()}` });
  await writeQueue(queue);
}

export async function getQueue(): Promise<PendingQuizResult[]> {
  return readQueue();
}

/** Remove successfully-synced items by localId */
export async function removeSynced(localIds: string[]): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((i) => !localIds.includes(i.localId)));
}

/** Clear all pending results for a specific user */
export async function clearQueueForUser(userId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((i) => i.userId !== userId));
}

/** How many items are pending */
export async function pendingCount(userId?: string): Promise<number> {
  const queue = await readQueue();
  if (userId) {
    return queue.filter((i) => i.userId === userId).length;
  }
  return queue.length;
}
