/**
 * @file cacheTransactions.ts
 * @description Atomic cache-replace and cache-purge operations for user-scoped
 * SQLite tables. These must run inside a real transaction that AWAITS its
 * callback: the sync drizzle `transaction()` (drizzle-orm/expo-sqlite) never
 * awaits an async callback, so `await db.transaction(async cb)` is NOT atomic
 * (audit P1-3). This module uses `withExclusiveTransactionAsync` on the raw
 * client — the same primitive the repositories use — keeping every statement
 * inside BEGIN…COMMIT with proper rollback.
 *
 * All functions are driver-agnostic (accept `RepositoryDatabase`) so they are
 * unit-testable against the better-sqlite3 test double (plan.md §10).
 */
import type { RepositoryDatabase } from "./repositories/types";
import type { ContentAccessEntry, Purchase } from "@/src/shared/types/schemas";

/**
 * Replaces the user's `access_map` rows in one transaction (delete + insert).
 * Atomic: if any insert fails (e.g. CHECK violation), the delete is rolled back
 * and the previous cache is preserved — never an empty/partial access map.
 */
export async function replaceAccessCache(
  db: RepositoryDatabase,
  userId: string,
  map: ReadonlyMap<string, ContentAccessEntry>,
): Promise<void> {
  await db.$client.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM access_map WHERE user_id = ?", userId);
    for (const entry of map.values()) {
      await txn.runAsync(
        `INSERT INTO access_map
          (user_id, item_id, item_type, has_access, is_free, price_cents)
          VALUES (?, ?, ?, ?, ?, ?)`,
        userId,
        entry.item_id,
        entry.item_type,
        entry.has_access ? 1 : 0,
        entry.is_free ? 1 : 0,
        entry.price_cents,
      );
    }
  });
}

/**
 * Replaces the user's `progress` rows in one transaction (delete + insert).
 */
export async function replaceProgressCache(
  db: RepositoryDatabase,
  userId: string,
  ids: ReadonlySet<string>,
  completedAt: string,
): Promise<void> {
  await db.$client.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM progress WHERE user_id = ?", userId);
    for (const lectureId of ids) {
      await txn.runAsync(
        "INSERT INTO progress (user_id, lecture_id, completed_at) VALUES (?, ?, ?)",
        userId,
        lectureId,
        completedAt,
      );
    }
  });
}

/**
 * Replaces the user's `best_scores` rows in one transaction (delete + insert).
 */
export async function replaceBestScoresCache(
  db: RepositoryDatabase,
  userId: string,
  data: ReadonlyMap<string, number>,
): Promise<void> {
  await db.$client.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM best_scores WHERE user_id = ?", userId);
    for (const [lectureId, score] of data) {
      await txn.runAsync(
        "INSERT INTO best_scores (user_id, lecture_id, score) VALUES (?, ?, ?)",
        userId,
        lectureId,
        score,
      );
    }
  });
}

/**
 * Replaces the user's `purchases` rows in one transaction (delete + insert).
 */
export async function replacePurchasesCache(
  db: RepositoryDatabase,
  userId: string,
  purchases: readonly Purchase[],
): Promise<void> {
  await db.$client.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM purchases WHERE user_id = ?", userId);
    for (const p of purchases) {
      await txn.runAsync(
        `INSERT INTO purchases
          (id, user_id, module_id, amount_cents, currency, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        p.id,
        userId,
        p.module_id,
        p.amount_cents,
        p.currency,
        p.status,
        p.created_at,
      );
    }
  });
}

/**
 * Purges every user-scoped row for a user across all six user tables in one
 * transaction (logout path). Includes the offline queue (`quiz_results`).
 */
export async function clearAllUserCacheRows(
  db: RepositoryDatabase,
  userId: string,
): Promise<void> {
  await db.$client.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM progress WHERE user_id = ?", userId);
    await txn.runAsync("DELETE FROM best_scores WHERE user_id = ?", userId);
    await txn.runAsync("DELETE FROM user_stats WHERE user_id = ?", userId);
    await txn.runAsync("DELETE FROM access_map WHERE user_id = ?", userId);
    await txn.runAsync("DELETE FROM purchases WHERE user_id = ?", userId);
    await txn.runAsync("DELETE FROM quiz_results WHERE user_id = ?", userId);
  });
}
