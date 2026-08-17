/**
 * cacheTransactions unit tests — regression coverage for the atomic
 * cache-replace / cache-purge helpers (audit P1-3).
 *
 * These guard against reintroducing `db.transaction(async cb)`: the sync
 * expo-sqlite driver's `transaction()` never awaits its callback, so an async
 * callback is NOT atomic — a failure after the delete leaves the cache empty.
 * `withExclusiveTransactionAsync` rolls the whole unit back. We verify:
 *   - a successful replace swaps old rows for new, atomically;
 *   - a failing insert rolls back the delete, preserving the previous cache;
 *   - the logout purge removes every user-scoped table.
 */
import { createTestDb } from "./helpers";
import type { ContentAccessEntry, Purchase } from "@/src/shared/types/schemas";
import {
  clearAllUserCacheRows,
  replaceAccessCache,
  replaceBestScoresCache,
  replaceProgressCache,
  replacePurchasesCache,
} from "../cacheTransactions";

describe("cacheTransactions", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  it("replaceAccessCache swaps rows for a user atomically", async () => {
    await db.$client.runAsync(
      "INSERT INTO access_map (user_id, item_id, item_type, has_access, is_free, price_cents) VALUES (?, ?, ?, ?, ?, ?)",
      "u1",
      "mod-1",
      "module",
      1,
      0,
      999,
    );

    await replaceAccessCache(
      db,
      "u1",
      new Map([
        [
          "sub-2",
          {
            item_id: "sub-2",
            item_type: "subject",
            has_access: false,
            is_free: true,
            price_cents: 0,
          },
        ],
      ]),
    );

    const rows = await db.$client.getAllAsync<{ item_id: string }>(
      "SELECT item_id FROM access_map WHERE user_id = ?",
      "u1",
    );
    expect(rows.map((r) => r.item_id)).toEqual(["sub-2"]);
  });

  it("replaceAccessCache rolls back the delete when an insert fails", async () => {
    await db.$client.runAsync(
      "INSERT INTO access_map (user_id, item_id, item_type, has_access, is_free, price_cents) VALUES (?, ?, ?, ?, ?, ?)",
      "u1",
      "mod-1",
      "module",
      1,
      0,
      999,
    );

    // item_type "bogus" violates the access_map_item_type_check CHECK constraint.
    // Cast required: the test's entire purpose is to feed DB-invalid input.
    const badEntry = {
      item_id: "mod-1",
      item_type: "bogus",
      has_access: true,
      is_free: false,
      price_cents: 999,
    } as unknown as ContentAccessEntry;
    const bad = new Map<string, ContentAccessEntry>([["mod-1", badEntry]]);

    await expect(replaceAccessCache(db, "u1", bad)).rejects.toThrow();

    const rows = await db.$client.getAllAsync<{ item_id: string }>(
      "SELECT item_id FROM access_map WHERE user_id = ?",
      "u1",
    );
    // The DELETE was rolled back — previous cache preserved, not emptied.
    expect(rows.map((r) => r.item_id)).toEqual(["mod-1"]);
  });

  it("replaceBestScoresCache swaps rows atomically", async () => {
    await db.$client.runAsync(
      "INSERT INTO best_scores (user_id, lecture_id, score) VALUES (?, ?, ?)",
      "u1",
      "lec-1",
      70,
    );

    await replaceBestScoresCache(
      db,
      "u1",
      new Map([
        ["lec-2", 90],
        ["lec-3", 60],
      ]),
    );

    const rows = await db.$client.getAllAsync<{ lecture_id: string }>(
      "SELECT lecture_id FROM best_scores WHERE user_id = ?",
      "u1",
    );
    expect(rows.map((r) => r.lecture_id).sort()).toEqual(["lec-2", "lec-3"]);
  });

  it("replaceProgressCache swaps rows atomically", async () => {
    await replaceProgressCache(db, "u1", new Set(["lec-1", "lec-2"]), "2026-01-01T00:00:00.000Z");
    const rows = await db.$client.getAllAsync<{ lecture_id: string }>(
      "SELECT lecture_id FROM progress WHERE user_id = ?",
      "u1",
    );
    expect(rows.map((r) => r.lecture_id).sort()).toEqual(["lec-1", "lec-2"]);
  });

  it("replacePurchasesCache swaps rows atomically", async () => {
    await replacePurchasesCache(db, "u1", [
      {
        id: "p-1",
        module_id: "mod-1",
        amount_cents: 500,
        currency: "usd",
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const rows = await db.$client.getAllAsync<{ id: string }>(
      "SELECT id FROM purchases WHERE user_id = ?",
      "u1",
    );
    expect(rows.map((r) => r.id)).toEqual(["p-1"]);
  });

  it("replacePurchasesCache rolls back the delete on a duplicate PK", async () => {
    await db.$client.runAsync(
      "INSERT INTO purchases (id, user_id, module_id, amount_cents, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      "p-1",
      "u1",
      "mod-1",
      500,
      "usd",
      "active",
      "2026-01-01T00:00:00.000Z",
    );

    // Two rows sharing the same PK → second insert violates the primary key
    const dupes = [
      {
        id: "p-9",
        module_id: "mod-2",
        amount_cents: 600,
        currency: "usd",
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "p-9",
        module_id: "mod-3",
        amount_cents: 700,
        currency: "usd",
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    await expect(replacePurchasesCache(db, "u1", dupes)).rejects.toThrow();

    const rows = await db.$client.getAllAsync<{ id: string }>(
      "SELECT id FROM purchases WHERE user_id = ?",
      "u1",
    );
    // DELETE was rolled back — the old row survives, nothing emptied.
    expect(rows.map((r) => r.id)).toEqual(["p-1"]);
  });

  it("clearAllUserCacheRows removes every user-scoped table for that user only", async () => {
    await db.$client.runAsync(
      "INSERT INTO progress (user_id, lecture_id, completed_at) VALUES (?, ?, ?)",
      "u1",
      "lec-1",
      "2026-01-01T00:00:00.000Z",
    );
    await db.$client.runAsync(
      "INSERT INTO best_scores (user_id, lecture_id, score) VALUES (?, ?, ?)",
      "u1",
      "lec-1",
      80,
    );
    await db.$client.runAsync(
      "INSERT INTO user_stats (user_id, payload, updated_at) VALUES (?, ?, ?)",
      "u1",
      "{}",
      "2026-01-01T00:00:00.000Z",
    );
    await db.$client.runAsync(
      "INSERT INTO access_map (user_id, item_id, item_type, has_access, is_free, price_cents) VALUES (?, ?, ?, ?, ?, ?)",
      "u1",
      "mod-1",
      "module",
      1,
      0,
      999,
    );
    await db.$client.runAsync(
      "INSERT INTO purchases (id, user_id, module_id, amount_cents, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      "p-1",
      "u1",
      "mod-1",
      500,
      "usd",
      "active",
      "2026-01-01T00:00:00.000Z",
    );
    await db.$client.runAsync(
      "INSERT INTO quiz_results (id, user_id, lecture_id, lecture_name, score, total_questions, correct_answers, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      "q-1",
      "u1",
      "lec-1",
      "L",
      80,
      10,
      8,
      "2026-01-01T00:00:00.000Z",
      "pending",
    );
    // Another user's rows must survive
    await db.$client.runAsync(
      "INSERT INTO progress (user_id, lecture_id, completed_at) VALUES (?, ?, ?)",
      "u2",
      "lec-9",
      "2026-01-01T00:00:00.000Z",
    );

    await clearAllUserCacheRows(db, "u1");

    const counts = await db.$client.getAllAsync<{ n: number }>(
      `SELECT
        (SELECT COUNT(*) FROM progress WHERE user_id = 'u1') +
        (SELECT COUNT(*) FROM best_scores WHERE user_id = 'u1') +
        (SELECT COUNT(*) FROM user_stats WHERE user_id = 'u1') +
        (SELECT COUNT(*) FROM access_map WHERE user_id = 'u1') +
        (SELECT COUNT(*) FROM purchases WHERE user_id = 'u1') +
        (SELECT COUNT(*) FROM quiz_results WHERE user_id = 'u1') AS n`,
    );
    expect(counts[0]?.n).toBe(0);

    const other = await db.$client.getAllAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM progress WHERE user_id = 'u2'",
    );
    expect(other[0]?.n).toBe(1);
  });
});