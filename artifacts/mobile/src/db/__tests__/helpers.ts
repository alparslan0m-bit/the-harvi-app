/**
 * Test helper: builds a driver-agnostic `RepositoryDatabase` over an in-memory
 * better-sqlite3 connection, applying the Drizzle schema. The production
 * `Database` (expo-sqlite) satisfies the same structural type, so repository
 * tests exercise exactly the code paths the app runs.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import * as schema from "../schema";
import type { RepositoryDatabase } from "../repositories/types";
import type { RawClient, RawTransaction } from "../rawClient";

type BindValue = string | number | boolean | Uint8Array | null;

export function createTestDb(): RepositoryDatabase {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");

  // Apply the same DDL drizzle-kit generates on device so the in-memory
  // schema matches production exactly.
  const migrationSql = fs.readFileSync(
    path.join(__dirname, "../../../drizzle/0000_init.sql"),
    "utf-8",
  );
  sqlite.exec(migrationSql);

  const orm = drizzle(sqlite, { schema });

  return {
    insert: orm.insert.bind(orm) as unknown as RepositoryDatabase["insert"],
    select: orm.select.bind(orm) as unknown as RepositoryDatabase["select"],
    update: orm.update.bind(orm) as unknown as RepositoryDatabase["update"],
    delete: orm.delete.bind(orm) as unknown as RepositoryDatabase["delete"],
    $client: createRawClient(sqlite),
  };
}

function bind(source: string, params: BindValue[]): { source: string; params: BindValue[] } {
  return { source, params };
}

function createRawClient(sqlite: Database.Database): RawClient {
  const txnRun = (source: string, params: BindValue[]) => {
    const stmt = sqlite.prepare(source);
    const info = stmt.run(...params);
    return Promise.resolve({
      changes: info.changes,
      lastInsertRowId: Number(info.lastInsertRowid),
    });
  };
  const tx: RawTransaction = {
    runAsync: (source, ...params) => txnRun(source, params),
  };

  return {
    execAsync: async (source) => {
      sqlite.exec(source);
    },
    runAsync: (source, ...params) => {
      const { source: s, params: p } = bind(source, params);
      return txnRun(s, p);
    },
    getAllAsync: async <T,>(source: string, ...params: BindValue[]) => {
      const { source: s, params: p } = bind(source, params);
      const stmt = sqlite.prepare(s);
      return stmt.all(...p) as T[];
    },
    getFirstAsync: async <T,>(source: string, ...params: BindValue[]) => {
      const { source: s, params: p } = bind(source, params);
      const stmt = sqlite.prepare(s);
      const row = stmt.get(...p);
      return (row as T | undefined) ?? null;
    },
    withExclusiveTransactionAsync: async (task) => {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        await task(tx);
        sqlite.exec("COMMIT");
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
  };
}