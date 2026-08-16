/**
 * @file metaRepository.ts
 * @description Read/write over the `app_meta` bookkeeping table (plan.md §4):
 * migration idempotency flags, cache-version gate, maintenance timestamps.
 */
import { eq } from "drizzle-orm";

import type { RepositoryDatabase } from "./types";
import { appMeta } from "../schema";

export class MetaRepository {
  constructor(private readonly db: RepositoryDatabase) {}

  async get(key: string): Promise<string | null> {
    const rows = await this.db
      .select({ value: appMeta.value })
      .from(appMeta)
      .where(eq(appMeta.key, key))
      .limit(1);
    return rows[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db
      .insert(appMeta)
      .values({ key, value })
      .onConflictDoUpdate({ target: appMeta.key, set: { value } });
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(appMeta).where(eq(appMeta.key, key));
  }

  /**
   * Reads the consolidated question-cache version gate. Bumped in lockstep with
   * the React Query queryKey so disk and query caches cannot desync (plan.md §4).
   */
  async getCacheVersion(): Promise<string | null> {
    return this.get("question_cache_version");
  }
}