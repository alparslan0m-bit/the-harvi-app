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
import { PendingQuizResult, PendingQuizResultSchema } from "@/src/shared/types";

import { getDb } from "@/src/db/client";
import { QueueRepository, type QueueRow } from "@/src/db/repositories/queueRepository";

/** Per-item sync retry cap — rows that fail this many times are dead-lettered
 * (kept pending but excluded from future flushes) so they never block the queue. */
export const MAX_SYNC_ATTEMPTS = 3;

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

  // Runtime validation (audit P3-5): docs claimed items are validated with
  // PendingQuizResultSchema but nothing validated them. Rejecting bad payloads
  // here prevents permanently-un-syncable rows (e.g. empty userId/lectureId).
  const parsed = PendingQuizResultSchema.safeParse({ localId, ...item });
  if (!parsed.success) {
    throw new Error(
      `Refusing to enqueue invalid quiz result: ${parsed.error.message}`,
    );
  }
  const v = parsed.data;

  const repo = await getQueueRepo();
  await repo.enqueue({
    id: v.localId,
    userId: v.userId,
    lectureId: v.lectureId,
    score: v.score,
    totalQuestions: v.totalQuestions,
    correctAnswers: v.correctAnswers,
    createdAt: v.createdAt,
  });
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
 * Retrieves the subset of the offline queue that is still eligible for sync —
 * pending rows that have not exhausted their retry cap (audit P1-2).
 *
 * @param userId - The ID of the user whose queue to retrieve
 * @param maxAttempts - Maximum allowed sync attempts per item
 * @returns An array of pending quiz results that should still be uploaded
 */
export async function getFlushableForUser(
  userId: string,
  maxAttempts: number = MAX_SYNC_ATTEMPTS,
): Promise<PendingQuizResult[]> {
  const rows = await (await getQueueRepo()).getFlushableForUser(
    userId,
    maxAttempts,
  );
  return rows.map(toPendingResult);
}

/**
 * Records a failed upload attempt for the given items, incrementing their
 * retry counter. Once an item reaches `MAX_SYNC_ATTEMPTS` it is excluded from
 * future flushes (dead-lettered) instead of blocking the whole queue.
 *
 * @param localIds - The local IDs of the items that failed to sync
 */
export async function recordFailure(localIds: string[]): Promise<void> {
  await (await getQueueRepo()).incrementFailure(localIds);
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