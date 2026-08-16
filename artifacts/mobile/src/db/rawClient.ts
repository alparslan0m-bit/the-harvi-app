/**
 * @file rawClient.ts
 * @description Minimal structural interface over the raw SQLite connection that
 * the repositories depend on for bulk / raw SQL paths. Both the expo-sqlite
 * `SQLiteDatabase` (via `drizzle(...).$client`) and a better-sqlite3 test
 * double satisfy it — keeping repositories driver-agnostic and unit-testable
 * against in-memory SQLite (plan.md §10).
 */
import type { SQLiteBindParams, SQLiteRunResult } from "expo-sqlite";

type BindValues = Array<string | number | boolean | Uint8Array | null>;

export interface RawTransaction {
  runAsync(source: string, ...params: BindValues): Promise<SQLiteRunResult>;
}

export interface RawClient {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: BindValues): Promise<SQLiteRunResult>;
  getAllAsync<T>(source: string, ...params: BindValues): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: BindValues): Promise<T | null>;
  withExclusiveTransactionAsync(
    task: (txn: RawTransaction) => Promise<void>,
  ): Promise<void>;
}

export type { SQLiteBindParams, SQLiteRunResult };