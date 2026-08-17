/**
 * @file maintenance.ts
 * @description Periodic on-device database cleanup (plan.md §6):
 *  - Purge `synced` quiz_results older than 30 days (retention).
 *  - `PRAGMA optimize` on cold start, debounced — cheap, reclaims query plans.
 *  - `VACUUM` throttled to once per 30 days — never per cold start, it
 *    rewrites the whole DB.
 */
import type { SQLiteDatabase } from "expo-sqlite";
import { getDb } from "./client";
import { QueueRepository } from "./repositories/queueRepository";

export const SYNCED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const VACUUM_KEY = "maintenance_last_vacuum";
const OPTIMIZE_DEBOUNCE_MS = 60 * 60 * 1000;

/**
 * Runs `PRAGMA optimize`, debounced to once per hour. Reads and rewrites
 * query-plan metadata; safe to run on cold start.
 *
 * @param db - The raw expo-sqlite connection
 * @returns True when the pragma actually ran
 */
export async function optimizeDatabase(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    OPTIMIZE_DEBOUNCE_KEY,
  );
  const last = row ? new Date(row.value).getTime() : 0;
  if (Date.now() - last < OPTIMIZE_DEBOUNCE_MS) return false;

  await db.execAsync("PRAGMA optimize");
  await db.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    OPTIMIZE_DEBOUNCE_KEY,
    new Date().toISOString(),
  );
  return true;
}

const OPTIMIZE_DEBOUNCE_KEY = "maintenance_last_optimize";

/**
 * Runs `VACUUM` to reclaim wasted pages. Throttled to monthly via app_meta —
 * never run per cold start (it rewrites the entire database).
 *
 * @param db - The raw expo-sqlite connection
 * @param force - Set to `true` to bypass the monthly throttle (e.g. post-migration run)
 */
export async function vacuumDatabase(
  db: SQLiteDatabase,
  force = false,
): Promise<boolean> {
  if (!force) {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ?",
      VACUUM_KEY,
    );
    const last = row ? new Date(row.value).getTime() : 0;
    if (Date.now() - last < 30 * 24 * 60 * 60 * 1000) return false;
  }

  await db.execAsync("VACUUM");
  await db.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    VACUUM_KEY,
    new Date().toISOString(),
  );
  return true;
}

/**
 * One-shot cold-start maintenance pass: purge expired synced rows, then
 * `PRAGMA optimize` (debounced), and finally throttled monthly `VACUUM`.
 *
 * @param db - The raw expo-sqlite connection
 */
export async function runColdStartMaintenance(
  db: SQLiteDatabase,
): Promise<void> {
  try {
    const drizzleDb = await getDb();
    const repo = new QueueRepository(drizzleDb);
    await repo.purgeExpired();
  } catch (err) {
    if (__DEV__) {
      console.warn("[maintenance] Retention purge failed:", err);
    }
  }
  try {
    await optimizeDatabase(db);
  } catch (err) {
    if (__DEV__) {
      console.warn("[maintenance] PRAGMA optimize failed:", err);
    }
  }
  try {
    await vacuumDatabase(db);
  } catch (err) {
    if (__DEV__) {
      console.warn("[maintenance] VACUUM failed:", err);
    }
  }
}