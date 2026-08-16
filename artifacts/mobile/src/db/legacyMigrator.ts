/**
 * @file legacyMigrator.ts
 * @description One-time, idempotent copy of legacy AsyncStorage data into the
 * SQLite + MMKV layer, guarded by `app_meta['async_migration_v1_done']`. Runs
 * in the background after Drizzle migrations (§6). Corrupt (Zod-rejected)
 * payloads are written to `migration_quarantine` with the raw JSON — never
 * silently dropped.
 *
 * The legacy AsyncStorage keys are NOT deleted here — they stay until Phase D
 * keeps the rollback window open (§10, §11).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import type { RawClient } from "./rawClient";
import { mmkv } from "@/src/shared/storage/mmkv";
import {
  PendingQuizResultSchema,
  CachedLectureSchema,
  YearWithModulesSchema,
  UserStatsSchema,
  ContentAccessEntrySchema,
  PurchaseSchema,
} from "@/src/shared/types/schemas";
import { generateUUID } from "@/src/shared/services/offlineQueue";

const MIGRATION_FLAG = "async_migration_v1_done";
const HIERARCHY_KEY = "harvi:hierarchy";

const GLOBAL_KEYS: Array<{ key: string; target: "mmkv" }> = [
  { key: "harvi:theme", target: "mmkv" },
  { key: "harvi:avatar", target: "mmkv" },
  { key: "harvi:displayName", target: "mmkv" },
  { key: "harvi:quiz:fkcol", target: "mmkv" },
];

function isUserKey(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix)) return null;
  const uid = key.slice(prefix.length);
  return uid.length > 0 ? uid : null;
}

function writeQuarantine(
  db: RawClient,
  sourceKey: string,
  raw: string,
  error: string,
): void {
  db.runAsync(
    "INSERT INTO migration_quarantine (id, source_key, raw, error, quarantined_at) VALUES (?, ?, ?, ?, ?)",
    generateUUID(),
    sourceKey,
    raw,
    error,
    new Date().toISOString(),
  ).catch(() => {
    // Quarantine write failure must never block the migration itself.
  });
}

/**
 * Copies hierarchy into the four normalized tables inside one transaction.
 */
async function migrateHierarchy(db: RawClient, raw: string): Promise<void> {
  const parsed = JSON.parse(raw);
  const result = z.array(YearWithModulesSchema).safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid hierarchy payload: ${result.error.message}`);
  }
  const years = result.data;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const year of years) {
      await txn.runAsync(
        "INSERT OR REPLACE INTO hierarchy_years (id, name, \"order\") VALUES (?, ?, ?)",
        year.id,
        year.name,
        year.order,
      );
      for (const mod of year.modules) {
        await txn.runAsync(
          "INSERT OR REPLACE INTO hierarchy_modules (id, name, year_id, \"order\", external_price_id) VALUES (?, ?, ?, ?, ?)",
          mod.id,
          mod.name,
          year.id,
          mod.order,
          mod.external_price_id ?? null,
        );
        for (const sub of mod.subjects) {
          await txn.runAsync(
            "INSERT OR REPLACE INTO hierarchy_subjects (id, name, module_id, \"order\") VALUES (?, ?, ?, ?)",
            sub.id,
            sub.name,
            mod.id,
            sub.order,
          );
          for (const lec of sub.lectures) {
            await txn.runAsync(
              "INSERT OR REPLACE INTO hierarchy_lectures (id, name, external_id, subject_id, question_count, is_free) VALUES (?, ?, ?, ?, ?, ?)",
              lec.id,
              lec.name,
              lec.external_id,
              sub.id,
              lec.question_count ?? null,
              lec.is_free == null ? null : lec.is_free ? 1 : 0,
            );
          }
        }
      }
    }
  });
}

/**
 * Copies queued quiz results as `status='pending'` rows (the new queue shape).
 */
async function migrateQueue(db: RawClient, raw: string): Promise<void> {
  const parsed = JSON.parse(raw);
  const result = z.array(PendingQuizResultSchema).safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid queue payload: ${result.error.message}`);
  }
  const items = result.data;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const item of items) {
      await txn.runAsync(
        "INSERT OR REPLACE INTO quiz_results (id, user_id, lecture_id, lecture_name, score, total_questions, correct_answers, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
        item.localId,
        item.userId,
        item.lectureId,
        "",
        item.score,
        item.totalQuestions,
        item.correctAnswers,
        item.createdAt,
      );
    }
  });
}

/**
 * Copies a lecture question cache into the `questions` table.
 */
async function migrateQuestionCache(
  db: RawClient,
  lectureId: string,
  raw: string,
): Promise<void> {
  const parsed = JSON.parse(raw);
  const result = CachedLectureSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid question cache: ${result.error.message}`);
  }
  const cached = result.data;
  const downloadedAt = cached.downloadedAt || new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const q of cached.questions) {
      await txn.runAsync(
        "INSERT OR REPLACE INTO questions (id, lecture_id, text, options, answer, explanation, image_url, downloaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        q.id,
        lectureId,
        q.text,
        JSON.stringify(q.options),
        q.answer,
        q.explanation ?? "",
        q.image_url ?? null,
        downloadedAt,
      );
    }
  });
}

/**
 * Copies a user-scoped domain cache into its normalized table.
 */
async function migrateUserCache(
  db: RawClient,
  key: string,
  userId: string,
  raw: string,
): Promise<void> {
  if (key.startsWith("harvi:progress:")) {
    const parsed = JSON.parse(raw);
    const result = z.array(z.string()).safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid progress payload: ${result.error.message}`);
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const lectureId of result.data) {
        await txn.runAsync(
          "INSERT OR REPLACE INTO progress (user_id, lecture_id, completed_at) VALUES (?, ?, ?)",
          userId,
          lectureId,
          new Date().toISOString(),
        );
      }
    });
    return;
  }

  if (key.startsWith("harvi:bestScores:")) {
    const parsed = JSON.parse(raw);
    const result = z.array(z.tuple([z.string(), z.number()])).safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid bestScores payload: ${result.error.message}`);
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const [lectureId, score] of result.data) {
        await txn.runAsync(
          "INSERT OR REPLACE INTO best_scores (user_id, lecture_id, score) VALUES (?, ?, ?)",
          userId,
          lectureId,
          score,
        );
      }
    });
    return;
  }

  if (key.startsWith("harvi:stats:")) {
    const parsed = JSON.parse(raw);
    const result = UserStatsSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid stats payload: ${result.error.message}`);
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO user_stats (user_id, payload, updated_at) VALUES (?, ?, ?)",
      userId,
      JSON.stringify(result.data),
      new Date().toISOString(),
    );
    return;
  }

  if (key.startsWith("harvi:access:")) {
    const parsed = JSON.parse(raw);
    const result = z
      .record(z.string(), ContentAccessEntrySchema)
      .safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid access payload: ${result.error.message}`);
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const [itemId, entry] of Object.entries(result.data)) {
        await txn.runAsync(
          "INSERT OR REPLACE INTO access_map (user_id, item_id, item_type, has_access, is_free, price_cents) VALUES (?, ?, ?, ?, ?, ?)",
          userId,
          itemId,
          entry.item_type,
          entry.has_access ? 1 : 0,
          entry.is_free ? 1 : 0,
          entry.price_cents,
        );
      }
    });
    return;
  }

  if (key.startsWith("harvi:purchases:")) {
    const parsed = JSON.parse(raw);
    const result = z.array(PurchaseSchema).safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid purchases payload: ${result.error.message}`);
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const purchase of result.data) {
        await txn.runAsync(
          "INSERT OR REPLACE INTO purchases (id, user_id, module_id, amount_cents, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          purchase.id,
          userId,
          purchase.module_id ?? null,
          purchase.amount_cents,
          purchase.currency,
          purchase.status,
          purchase.created_at,
        );
      }
    });
    return;
  }

  throw new Error(`Unknown user cache key: ${key}`);
}

/**
 * Copies a single AsyncStorage key into its target layer. On validation
 * failure the raw payload is quarantined, never dropped.
 */
async function migrateKey(
  db: RawClient,
  key: string,
  raw: string,
): Promise<void> {
  try {
    if (key === HIERARCHY_KEY) {
      await migrateHierarchy(db, raw);
      return;
    }
    if (key === "harvi:quiz_queue") {
      await migrateQueue(db, raw);
      return;
    }
    if (key.startsWith("harvi:qcache:")) {
      const lectureId = key.slice("harvi:qcache:".length);
      await migrateQuestionCache(db, lectureId, raw);
      return;
    }

    for (const g of GLOBAL_KEYS) {
      if (key === g.key) {
        if (g.key === "harvi:theme") mmkv.setTheme(raw as never);
        else if (g.key === "harvi:avatar") mmkv.setAvatar(raw);
        else if (g.key === "harvi:displayName") mmkv.setDisplayName(raw);
        else if (g.key === "harvi:quiz:fkcol") mmkv.setFkCol(raw);
        return;
      }
    }

    for (const prefix of [
      "harvi:progress:",
      "harvi:bestScores:",
      "harvi:stats:",
      "harvi:access:",
      "harvi:purchases:",
    ]) {
      const userId = isUserKey(key, prefix);
      if (userId) {
        await migrateUserCache(db, key, userId, raw);
        return;
      }
    }
  } catch (err) {
    writeQuarantine(db, key, raw, err instanceof Error ? err.message : String(err));
  }
}

/**
 * Runs the one-time legacy migration. Idempotent: no-op when the flag is set.
 *
 * @param db - The opened Drizzle database instance
 */
export async function runLegacyMigration(db: {
  $client: RawClient;
}): Promise<void> {
  const raw = db.$client;

  const flagRow = await raw.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    MIGRATION_FLAG,
  );
  if (flagRow) return;

  const allKeys = await AsyncStorage.getAllKeys();
  const targetKeys = allKeys.filter(
    (k) =>
      k === HIERARCHY_KEY ||
      k === "harvi:quiz_queue" ||
      k.startsWith("harvi:qcache:") ||
      GLOBAL_KEYS.some((g) => g.key === k) ||
      /^harvi:(progress|bestScores|stats|access|purchases):.+$/.test(k),
  );

  if (targetKeys.length > 0) {
    const pairs = await AsyncStorage.multiGet(targetKeys);
    for (const [key, value] of pairs) {
      if (key != null && value != null) {
        await migrateKey(raw, key, value);
      }
    }
  }

  await raw.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    MIGRATION_FLAG,
    new Date().toISOString(),
  );
}