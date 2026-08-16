/**
 * @file offlineQueue.ts
 * @description Persistent, sequential queue for quiz results when offline.
 *
 * Phase B (plan.md §9, §11): the queue now lives in the `quiz_results` table
 * (`status='pending'` rows) via `QueueRepository` — atomic INSERT/UPDATE
 * replaces the old read-all/mutate/write-all lock. During the bake window
 * before the legacy migration flag flips, reads fall back to AsyncStorage so
 * pre-migration data is never empty; after the flag flips, SQLite only.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PendingQuizResult, PendingQuizResultSchema } from "@/src/shared/types";
import { z } from "zod";

import { getDb } from "@/src/db/client";
import { QueueRepository, type QueueRow } from "@/src/db/repositories/queueRepository";
import { isLegacyMigrationDone } from "@/src/db/migrationStatus";

const QUEUE_KEY = "harvi:quiz_queue";

// ── Legacy AsyncStorage fallback (used only until the migration flag flips) ──

/**
 * Reads and parses the legacy queue from AsyncStorage with Zod validation.
 *
 * @returns An array of validated PendingQuizResult objects
 */
async function readLegacyQueue(): Promise<PendingQuizResult[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const result = z.array(PendingQuizResultSchema).safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/**
 * Persists the legacy queue array to AsyncStorage (single retry on I/O error).
 *
 * @param queue - The queue array to save
 * @throws {Error} If the write fails after the retry attempt
 */
async function writeLegacyQueue(queue: PendingQuizResult[]): Promise<void> {
  const payload = JSON.stringify(queue);
  try {
    await AsyncStorage.setItem(QUEUE_KEY, payload);
  } catch (firstErr) {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, payload);
    } catch (retryErr) {
      console.error(
        "[offlineQueue] CRITICAL: Failed to persist legacy quiz result after retry",
        retryErr,
      );
      throw retryErr;
    }
  }
}

// ── SQLite path (canonical once migrated) ────────────────────────────────────

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

  // Mirror into the legacy queue during the bake window so a flush that still
  // reads AsyncStorage picks it up; harmless once the flag flips (Phase D
  // deletes the legacy keys entirely).
  if (!(await isLegacyMigrationDone())) {
    const legacy = await readLegacyQueue();
    legacy.push({ ...item, localId });
    await writeLegacyQueue(legacy);
  }
}

/**
 * Retrieves the current offline queue without mutating it.
 *
 * After migration: returns `status='pending'` rows only (keeps `syncStore`'s
 * unchanged flush loop from re-uploading synced rows). Before migration:
 * returns the legacy AsyncStorage queue.
 *
 * @returns An array of all pending quiz results
 */
export async function getQueue(): Promise<PendingQuizResult[]> {
  if (await isLegacyMigrationDone()) {
    const rows = await (await getQueueRepo()).getPending();
    return rows.map(toPendingResult);
  }
  return readLegacyQueue();
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

  if (!(await isLegacyMigrationDone())) {
    const legacy = await readLegacyQueue();
    await writeLegacyQueue(legacy.filter((i) => !localIds.includes(i.localId)));
  }
}

/**
 * Clears all pending results for a specific user (logout / reset).
 *
 * @param userId - The ID of the user whose pending data should be removed
 */
export async function clearQueueForUser(userId: string): Promise<void> {
  await (await getQueueRepo()).clearForUser(userId);

  if (!(await isLegacyMigrationDone())) {
    const legacy = await readLegacyQueue();
    await writeLegacyQueue(legacy.filter((i) => i.userId !== userId));
  }
}

/**
 * Returns the number of items currently waiting in the offline queue.
 *
 * @param userId - Optional user ID to filter the count for a specific user
 * @returns The number of pending items
 */
export async function pendingCount(userId?: string): Promise<number> {
  if (await isLegacyMigrationDone()) {
    return (await getQueueRepo()).pendingCount(userId);
  }
  const queue = await readLegacyQueue();
  if (userId) {
    return queue.filter((i) => i.userId === userId).length;
  }
  return queue.length;
}