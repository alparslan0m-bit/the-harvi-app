/**
 * Offline quiz-result queue.
 * When a quiz finishes without network connectivity the result is enqueued
 * here (AsyncStorage).  SyncContext drains the queue as soon as the device
 * comes back online.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "harvi:quiz_queue";

export interface PendingQuizResult {
  localId: string;
  userId: string;
  lectureId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  createdAt: string;
}

async function readQueue(): Promise<PendingQuizResult[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingQuizResult[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingQuizResult[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // best-effort
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

/** How many items are pending */
export async function pendingCount(): Promise<number> {
  return (await readQueue()).length;
}
