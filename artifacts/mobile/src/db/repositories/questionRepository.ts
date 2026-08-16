/**
 * @file questionRepository.ts
 * @description CRUD over the `questions` table (plan.md §4, §6.1) — the
 * on-device mirror of each lecture's question bank. Bulk writes are chunked
 * through expo-sqlite transactions; narrow reads stay single-lecture.
 */
import { and, asc, eq } from "drizzle-orm";

import type { RepositoryDatabase } from "./types";
import { questions } from "../schema";

export interface QuestionRow {
  id: string;
  lectureId: string;
  text: string;
  options: string;
  answer: number;
  explanation: string;
  imageUrl: string | null;
  downloadedAt: string;
}

export interface QuestionRowInput {
  id: string;
  lectureId: string;
  text: string;
  options: string;
  answer: number;
  explanation?: string;
  imageUrl?: string | null;
  downloadedAt?: string;
}

export interface LectureCacheMeta {
  questionCount: number;
  downloadedAt: string | null;
}

export class QuestionRepository {
  constructor(private readonly db: RepositoryDatabase) {}

  /**
   * Replaces a lecture's question bank in one transaction (delete + insert),
   * keeping the local mirror in lockstep with a fresh download.
   */
  async replaceLecture(
    lectureId: string,
    rows: QuestionRowInput[],
  ): Promise<void> {
    const downloadedAt = new Date().toISOString();
    await this.db.$client.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("DELETE FROM questions WHERE lecture_id = ?", lectureId);
      for (const row of rows) {
        await txn.runAsync(
          "INSERT OR REPLACE INTO questions (id, lecture_id, text, options, answer, explanation, image_url, downloaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          row.id,
          lectureId,
          row.text,
          row.options,
          row.answer,
          row.explanation ?? "",
          row.imageUrl ?? null,
          row.downloadedAt ?? downloadedAt,
        );
      }
    });
  }

  /**
   * Reads all questions for a lecture, oldest first by download.
   */
  async getByLecture(lectureId: string): Promise<QuestionRow[]> {
    const rows = await this.db
      .select()
      .from(questions)
      .where(eq(questions.lectureId, lectureId))
      .orderBy(asc(questions.downloadedAt));
    return rows.map(toQuestionRow);
  }

  /**
   * Lightweight meta read — avoids deserialising the full question set.
   */
  async getMeta(lectureId: string): Promise<LectureCacheMeta | null> {
    const rows = await this.db.$client.getAllAsync<{
      count: number;
      downloaded_at: string | null;
    }>(
      "SELECT COUNT(*) as count, MAX(downloaded_at) as downloaded_at FROM questions WHERE lecture_id = ?",
      lectureId,
    );
    const first = rows[0];
    if (!first || first.count === 0) return null;
    return {
      questionCount: Number(first.count),
      downloadedAt: first.downloaded_at,
    };
  }

  /**
   * Removes a single lecture's question bank.
   */
  async clearLecture(lectureId: string): Promise<void> {
    await this.db
      .delete(questions)
      .where(eq(questions.lectureId, lectureId));
  }

  /**
   * Removes every cached lecture (cache-version bump / logout).
   */
  async clearAll(): Promise<void> {
    await this.db.delete(questions);
  }

  /**
   * Counts lectures that currently have at least one cached question.
   */
  async countLectures(): Promise<number> {
    const rows = await this.db.$client.getAllAsync<{ c: number }>(
      "SELECT COUNT(DISTINCT lecture_id) as c FROM questions",
    );
    return Number(rows[0]?.c ?? 0);
  }
}

function toQuestionRow(row: typeof questions.$inferSelect): QuestionRow {
  return {
    id: row.id,
    lectureId: row.lectureId,
    text: row.text,
    options: row.options,
    answer: row.answer,
    explanation: row.explanation,
    imageUrl: row.imageUrl,
    downloadedAt: row.downloadedAt,
  };
}