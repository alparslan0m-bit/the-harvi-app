/**
 * MetaRepository unit tests — in-memory SQLite (plan.md §10).
 */
import { createTestDb } from "./helpers";
import { MetaRepository } from "../repositories/metaRepository";

describe("MetaRepository", () => {
  let db: ReturnType<typeof createTestDb>;
  let repo: MetaRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new MetaRepository(db);
  });

  it("returns null for a missing key", async () => {
    expect(await repo.get("missing")).toBeNull();
  });

  it("sets and reads a value", async () => {
    await repo.set("test_timestamp_key", "2026-01-01T00:00:00.000Z");
    expect(await repo.get("test_timestamp_key")).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("upserts on conflict", async () => {
    await repo.set("k", "v1");
    await repo.set("k", "v2");
    expect(await repo.get("k")).toBe("v2");
  });

  it("deletes a key", async () => {
    await repo.set("k", "v");
    await repo.delete("k");
    expect(await repo.get("k")).toBeNull();
  });
});