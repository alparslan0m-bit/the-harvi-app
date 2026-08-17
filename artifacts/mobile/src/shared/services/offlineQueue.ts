/**
 * @file offlineQueue.ts
 * @description Persistent, sequential queue for quiz results when offline.
 *
 * The queue lives in the `quiz_results` table (`status='pending'` rows) via
 * `QueueRepository` — atomic INSERT/UPDATE replaces the old read-all/mutate/
 * write-all lock (plan.md §9). `getQueue()` returns `status='pending'` rows
 * only, which keeps `syncStore`'s unchanged flush loop from re-uploading
 * synced rows.
 */
import { PendingQuizResult } from "@/src/shared/types";

import { getDb } from "@/src/db/client";
import { QueueRepository, type QueueRow } from "@/src/db/repositories/queueRepository";

async function getQueueRepo(): Promise<QueueRepository> {
  return new QueueRepository(await getDb());
}

function toPendingResult(row: QueueRow): PendingQuizResult {
  return {
    localId: row.id,
    userId: row.userId,
    lectureId: row.lectureId,
    score: row.score,
    totalQuestions: row.totalQuestions,
    correctAnswers: row.correctAnswers,
    createdAt: row.createdAt,
  };
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
 * Enqueues a new quiz result into the offline queue (atomic INSERT — no lock).
 * Called immediately after an optimistic UI update when a quiz completes.
 *
 * @param item - The quiz result payload (without localId)
 * @param providedLocalId - Optional pre-generated local ID, defaults to a UUID
 * @returns A Promise that resolves when the item is persisted
 */
export async function enqueueQuizResult(
  item: Omit<PendingQuizResult, "localId">,
  providedLocalId?: string,
): Promise<void> {
  const localId = providedLocalId ?? generateUUID();
  const repo = await getQueueRepo();
  await repo.enqueue({
    id: localId,
    userId: item.userId,
    lectureId: item.lectureId,
    score: item.score,
    totalQuestions: item.totalQuestions,
    correctAnswers: item.correctAnswers,
    createdAt: item.createdAt,
  });
}

/**
 * Retrieves the current offline queue without mutating it.
 *
 * Returns `status='pending'` rows only (keeps `syncStore`'s unchanged flush
 * loop from re-uploading synced rows).
 *
 * @returns An array of all pending quiz results
 */
export async function getQueue(): Promise<PendingQuizResult[]> {
  const rows = await (await getQueueRepo()).getPending();
  return rows.map(toPendingResult);
}

/**
 * Retrieves the current offline queue for a specific user without mutating it.
 *
 * @param userId - The ID of the user whose queue to retrieve
 * @returns An array of all pending quiz results for the user
 */
export async function getQueueForUser(userId: string): Promise<PendingQuizResult[]> {
  const rows = await (await getQueueRepo()).getPendingForUser(userId);
  return rows.map(toPendingResult);
}

/**
 * Marks items as synced so the background sync engine stops retrying them.
 *
 * @param localIds - An array of local UUIDs that successfully synced
 * @returns A Promise that resolves when the queue is updated on disk
 */
export async function removeSynced(localIds: string[]): Promise<void> {
  if (localIds.length === 0) return;
  await (await getQueueRepo()).markSynced(localIds);
}

/**
 * Clears all pending results for a specific user (logout / reset).
 *
 * @param userId - The ID of the user whose pending data should be removed
 */
export async function clearQueueForUser(userId: string): Promise<void> {
  await (await getQueueRepo()).clearForUser(userId);
}

/**
 * Returns the number of items currently waiting in the offline queue.
 *
 * @param userId - Optional user ID to filter the count for a specific user
 * @returns The number of pending items
 */
export async function pendingCount(userId?: string): Promise<number> {
  return (await getQueueRepo()).pendingCount(userId);
}