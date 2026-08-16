/**
 * @file migrationStatus.ts
 * @description Module-level cache of the legacy-migration completion flag.
 * Services dual-read during the Phase B bake window: once
 * `app_meta['async_migration_v1_done']` is set (or the in-memory flag is
 * marked by the migrator), services read SQLite; until then they fall back to
 * AsyncStorage so the pre-migration window never serves empty data
 * (plan.md §11 Phase B).
 */
import { getDb } from "./client";
import { MetaRepository } from "./repositories/metaRepository";

export const LEGACY_MIGRATION_FLAG = "async_migration_v1_done";

let legacyMigrated: boolean | null = null;

/**
 * Marks the legacy migration as done in memory. Called by the migrator once
 * the flag row is written, so services stop falling back to AsyncStorage
 * immediately after the copy completes.
 */
export function markLegacyMigrationDone(): void {
  legacyMigrated = true;
}

/**
 * Resets the in-memory flag (used between test cases).
 */
export function resetLegacyMigrationStatus(): void {
  legacyMigrated = null;
}

/**
 * Returns whether the one-time AsyncStorage → SQLite migration has completed.
 * The result is cached; `markLegacyMigrationDone()` flips it forward the moment
 * the migrator finishes. On a DB read error we conservatively fall back to
 * AsyncStorage (Phase B/C only — the keys still exist until Phase D).
 *
 * @returns True once the legacy data has been copied into SQLite
 */
export async function isLegacyMigrationDone(): Promise<boolean> {
  if (legacyMigrated !== null) return legacyMigrated;
  try {
    const db = await getDb();
    legacyMigrated =
      (await new MetaRepository(db).get(LEGACY_MIGRATION_FLAG)) !== null;
  } catch {
    legacyMigrated = false;
  }
  return legacyMigrated;
}