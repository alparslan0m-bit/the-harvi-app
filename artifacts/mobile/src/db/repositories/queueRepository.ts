/**
 * @file queueRepository.ts
 * @description CRUD over `quiz_results` for the offline sync engine
 * (plan.md §4, §6.1). `status='pending'` rows are the queue; `synced` rows are
 * retained for local history and purged by retention (§6 maintenance).
 */
import { and, asc, count, eq, inArray, isNotNull, lt } from "drizzle-orm";

import type { RepositoryDatabase } from "./types";
import { quizResults } from "../schema";
import { SYNCED_RETENTION_MS } from "../maintenance";

export interface QueueRow {
  id: string;
  userId: string;
  lectureId: string;
  lectureName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  createdAt: string;
  status: "pending" | "synced";
  syncedAt: string | null;
}

export interface NewQueueItem {
  id: string;
  userId: string;
  lectureId: string;
  lectureName?: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  createdAt: string;
}

export class QueueRepository {
  constructor(private readonly db: RepositoryDatabase) {}

  /**
   * Enqueues a pending quiz result — single atomic INSERT, no lock (§4).
   */
  async enqueue(item: NewQueueItem): Promise<void> {
    await this.db.insert(quizResults).values({
      id: item.id,
      userId: item.userId,
      lectureId: item.lectureId,
      lectureName: item.lectureName ?? "",
      score: item.score,
      totalQuestions: item.totalQuestions,
      correctAnswers: item.correctAnswers,
      createdAt: item.createdAt,
      status: "pending",
    });
  }

  /**
   * Returns pending rows only, oldest first — keeps `syncStore`'s unchanged
   * flush loop from re-uploading synced rows (plan.md §2 #4).
   */
  async getPending(): Promise<QueueRow[]> {
    const rows = await this.db
      .select()
      .from(quizResults)
      .where(eq(quizResults.status, "pending"))
      .orderBy(asc(quizResults.createdAt));
    return rows.map(toQueueRow);
  }

  /**
   * Returns pending rows for a specific user, oldest first.
   */
  async getPendingForUser(userId: string): Promise<QueueRow[]> {
    const rows = await this.db
      .select()
      .from(quizResults)
      .where(and(eq(quizResults.status, "pending"), eq(quizResults.userId, userId)))
      .orderBy(asc(quizResults.createdAt));
    return rows.map(toQueueRow);
  }

  /**
   * Marks the given local IDs as synced inside one transaction.
   */
  async markSynced(localIds: string[]): Promise<void> {
    if (localIds.length === 0) return;
    await this.db
      .update(quizResults)
      .set({ status: "synced", syncedAt: new Date().toISOString() })
      .where(inArray(quizResults.id, localIds));
  }

  /**
   * Deletes pending rows for a user (logout / cache clear).
   */
  async clearForUser(userId: string): Promise<void> {
    await this.db
      .delete(quizResults)
      .where(
        and(
          eq(quizResults.userId, userId),
          eq(quizResults.status, "pending"),
        ),
      );
  }

  /**
   * Counts pending rows, optionally scoped to a user.
   */
  async pendingCount(userId?: string): Promise<number> {
    const condition = userId
      ? and(
          eq(quizResults.status, "pending"),
          eq(quizResults.userId, userId),
        )
      : eq(quizResults.status, "pending");
    const [row] = await this.db
      .select({ count: count() })
      .from(quizResults)
      .where(condition);
    return row?.count ?? 0;
  }

  /**
   * Purges synced rows older than the retention window (30 days). Called from
   * cold-start maintenance; returns the number of rows deleted.
   */
  async purgeExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - SYNCED_RETENTION_MS).toISOString();
    const result = await this.db
      .delete(quizResults)
      .where(
        and(
          eq(quizResults.status, "synced"),
          isNotNull(quizResults.syncedAt),
          lt(quizResults.syncedAt, cutoff),
        ),
      );
    return result.changes;
  }
}

function toQueueRow(row: typeof quizResults.$inferSelect): QueueRow {
  return {
    id: row.id,
    userId: row.userId,
    lectureId: row.lectureId,
    lectureName: row.lectureName,
    score: row.score,
    totalQuestions: row.totalQuestions,
    correctAnswers: row.correctAnswers,
    createdAt: row.createdAt,
    status: row.status as "pending" | "synced",
    syncedAt: row.syncedAt,
  };
}