/**
 * @file provider.tsx
 * @description React context that opens the on-device database, applies Drizzle
 * migrations, and exposes the initialized instance + migration state to the
 * tree. Per plan.md §6: renders `children` as soon as migrations complete, and
 * kicks off the one-time legacy AsyncStorage migrator in the background (does
 * not block first render). MMKV values are synchronous regardless.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getDb, type Database } from "./client";
import { useDatabaseMigrations, type MigrationState } from "./migrate";
import { runLegacyMigration } from "./legacyMigrator";

interface DatabaseContextValue {
  db: Database | null;
  migrationState: MigrationState;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

function DatabaseProviderInner({
  db,
  children,
}: {
  db: Database;
  children: ReactNode;
}) {
  const migrationState = useDatabaseMigrations(db);

  // Background, non-blocking legacy migration — runs once (idempotent, guarded
  // by app_meta['async_migration_v1_done']). Fire-and-forget: never gates
  // children rendering.
  useEffect(() => {
    if (!migrationState.success) return;
    runLegacyMigration(db).catch((err) => {
      if (__DEV__) {
        console.warn("[DatabaseProvider] Legacy migration failed:", err);
      }
    });
  }, [migrationState.success, db]);

  const value = useMemo(
    () => ({ db, migrationState }),
    [db, migrationState],
  );

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

/**
 * Global provider for the Harvi SQLite database. Opens the DB and applies
 * migrations before mounting children (the legacy copy is background and does
 * not gate rendering).
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDb()
      .then((opened) => {
        if (!cancelled) setDb(opened);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    throw error;
  }

  if (!db) {
    return null;
  }

  return <DatabaseProviderInner db={db}>{children}</DatabaseProviderInner>;
}

/**
 * Reads the current database instance from context.
 *
 * @throws If used outside `DatabaseProvider` or before the DB is opened
 */
export function useDatabase(): Database {
  const ctx = useContext(DatabaseContext);
  if (!ctx?.db) {
    throw new Error("useDatabase must be used within DatabaseProvider after the DB is opened");
  }
  return ctx.db;
}