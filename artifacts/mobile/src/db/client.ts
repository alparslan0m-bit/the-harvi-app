/**
 * @file client.ts
 * @description Opens the Harvi on-device SQLite database, applies PRAGMA tuning,
 * and exposes a Drizzle ORM instance. Uses the catalog-pinned stable sync driver
 * (`drizzle-orm/expo-sqlite`); the async driver (`drizzle-orm/expo-sqlite/async`)
 * is the documented upgrade path once drizzle 1.0 stable ships (plan.md §2 #6).
 */
import * as SQLite from "expo-sqlite";
import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

export const DATABASE_NAME = "harvi.db";

export type Database = ExpoSQLiteDatabase<typeof schema> & {
  $client: SQLite.SQLiteDatabase;
};

let dbInstance: Database | null = null;
let dbPromise: Promise<Database> | null = null;

/**
 * Applies the on-device PRAGMA tuning once per connection (plan.md §4).
 *
 * @param db - The raw expo-sqlite connection
 */
async function applyPragmas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -8000;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
}

/**
 * Opens (or returns the existing) Drizzle database instance.
 * PRAGMAs are applied exactly once per connection.
 *
 * @returns The singleton Drizzle database
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const raw = await SQLite.openDatabaseAsync(DATABASE_NAME, {
      enableChangeListener: true,
    });
    await applyPragmas(raw);
    dbInstance = drizzle(raw, { schema });
    return dbInstance;
  })();

  try {
    return await dbPromise;
  } catch (err) {
    dbPromise = null;
    throw err;
  }
}

/**
 * Clears the singleton (used in tests between cases).
 */
export function resetDb(): void {
  dbInstance = null;
  dbPromise = null;
}

/**
 * The raw expo-sqlite connection, for APIs Drizzle doesn't expose
 * (e.g. `withTransactionAsync` bulk writes, `execAsync` maintenance).
 * Resolves after the DB is opened and PRAGMAs applied.
 */
export async function getRawDb(): Promise<SQLite.SQLiteDatabase> {
  const drizzleDb = await getDb();
  return drizzleDb.$client;
}