/**
 * @file offlineQueue.ts
 * @description Provides a persistent, sequential queue for storing quiz results when the device is offline.
 * It utilizes AsyncStorage for local persistence and implements a strict Promise-chain lock (`withQueueLock`)
 * to eliminate race conditions when reading/writing the queue array concurrently.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PendingQuizResult, PendingQuizResultSchema } from "@/src/shared/types";
import { z } from "zod";

const QUEUE_KEY = "harvi:quiz_queue";

/**
 * A global Promise chain used to sequentialize all reads and writes to AsyncStorage.
 * Prevents race conditions where a concurrent read before a write finishes could result in data loss.
 */
let queueLock: Promise<void> = Promise.resolve();

/**
 * Executes a function sequentially within the global queue lock.
 * 
 * @param fn - The asynchronous function (read/write operation) to execute
 * @returns A Promise that resolves with the result of the function
 * 
 * @example
 * ```ts
 * await withQueueLock(async () => {
 *   const data = await readQueue();
 *   await writeQueue([...data, newItem]);
 * });
 * ```
 */
async function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queueLock = queueLock.then(async () => {
      try {
        resolve(await fn());
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Generates a standard v4 UUID.
 * Falls back to a pseudo-random implementation if the native crypto API is unavailable.
 * 
 * @returns A randomly generated UUID string
 */
export function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Reads and parses the current offline queue from AsyncStorage.
 * Enforces strict runtime type validation using Zod to ensure malformed payloads never crash the sync engine.
 * 
 * @returns An array of validated PendingQuizResult objects
 */
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

/**
 * Persists the provided queue array to AsyncStorage.
 * Includes a built-in single-retry mechanism to handle transient I/O errors commonly seen on mobile devices.
 * 
 * @param queue - The array of PendingQuizResult objects to save
 * @throws {Error} If the write fails after the retry attempt
 */
async function writeQueue(queue: PendingQuizResult[]): Promise<void> {
  const payload = JSON.stringify(queue);
  try {
    await AsyncStorage.setItem(QUEUE_KEY, payload);
  } catch (firstErr) {
    // Retry once — transient I/O errors are common on mobile
    try {
      await AsyncStorage.setItem(QUEUE_KEY, payload);
    } catch (retryErr) {
      console.error(
        "[offlineQueue] CRITICAL: Failed to persist quiz result after retry",
        retryErr,
      );
      throw retryErr; // Let caller handle (show user notification)
    }
  }
}

/**
 * Enqueues a new quiz result into the offline storage.
 * This is called immediately after an optimistic UI update when the user completes a quiz.
 * 
 * @param item - The quiz result payload (without localId)
 * @param providedLocalId - Optional pre-generated local ID, defaults to a newly generated UUID
 * @returns A Promise that resolves when the item is safely persisted to disk
 */
export async function enqueueQuizResult(
  item: Omit<PendingQuizResult, "localId">,
  providedLocalId?: string,
): Promise<void> {
  return withQueueLock(async () => {
    const queue = await readQueue();
    queue.push({ ...item, localId: providedLocalId ?? generateUUID() });
    await writeQueue(queue);
  });
}

/**
 * Retrieves the current state of the offline queue without mutating it.
 * Typically used by the background sync engine before batch uploading to Supabase.
 * 
 * @returns An array of all pending quiz results
 */
export async function getQueue(): Promise<PendingQuizResult[]> {
  return readQueue();
}

/** 
 * Removes items from the offline queue that have been successfully synchronized with the backend.
 * 
 * @param localIds - An array of local UUIDs that successfully synced
 * @returns A Promise that resolves when the queue is updated on disk
 */
export async function removeSynced(localIds: string[]): Promise<void> {
  return withQueueLock(async () => {
    const queue = await readQueue();
    await writeQueue(queue.filter((i) => !localIds.includes(i.localId)));
  });
}

/** 
 * Clears all pending results for a specific user.
 * Used during user logout or when resetting application state.
 * 
 * @param userId - The ID of the user whose pending data should be removed
 */
export async function clearQueueForUser(userId: string): Promise<void> {
  return withQueueLock(async () => {
    const queue = await readQueue();
    await writeQueue(queue.filter((i) => i.userId !== userId));
  });
}

/** 
 * Returns the number of items currently waiting in the offline queue.
 * Useful for displaying sync status indicators in the UI.
 * 
 * @param userId - Optional user ID to filter the count for a specific user
 * @returns The number of pending items
 */
export async function pendingCount(userId?: string): Promise<number> {
  const queue = await readQueue();
  if (userId) {
    return queue.filter((i) => i.userId === userId).length;
  }
  return queue.length;
}
