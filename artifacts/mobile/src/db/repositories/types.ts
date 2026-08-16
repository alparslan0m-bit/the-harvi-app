/**
 * @file types.ts
 * @description Driver-agnostic database surface used by the repositories.
 * The production `Database` (expo-sqlite) satisfies it; tests build an instance
 * over better-sqlite3 against the same schema (plan.md §10).
 */
import type { Database } from "../client";
import type { RawClient } from "../rawClient";

export type RepositoryDatabase = Pick<
  Database,
  "insert" | "select" | "update" | "delete"
> & {
  $client: RawClient;
};