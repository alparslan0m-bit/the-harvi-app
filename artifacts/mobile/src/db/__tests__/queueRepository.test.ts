/**
 * QueueRepository unit tests — exercised against in-memory SQLite via the
 * driver-agnostic RepositoryDatabase surface (plan.md §10).
 */
import { createTestDb } from "./helpers";
import { QueueRepository } from "../repositories/queueRepository";

describe("QueueRepository", () => {
  let db: ReturnType<typeof createTestDb>;
  let repo: QueueRepository;

  const item = {
    id: "q-1",
    userId: "u-1",
    lectureId: "lec-1",
    lectureName: "Lecture One",
    score: 80,
    totalQuestions: 10,
    correctAnswers: 8,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    db = createTestDb();
    repo = new QueueRepository(db);
  });

  it("enqueues a pending row", async () => {
    await repo.enqueue(item);
    const pending = await repo.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      id: "q-1",
      userId: "u-1",
      status: "pending",
      syncedAt: null,
    });
  });

  it("returns only pending rows in createdAt order", async () => {
    await repo.enqueue({ ...item, id: "q-1", createdAt: "2026-01-01T00:00:00.000Z" });
    await repo.enqueue({ ...item, id: "q-2", createdAt: "2026-01-02T00:00:00.000Z" });
    await repo.enqueue({ ...item, id: "q-3", createdAt: "2026-01-03T00:00:00.000Z" });
    await repo.markSynced(["q-2"]);

    const pending = await repo.getPending();
    expect(pending.map((r) => r.id)).toEqual(["q-1", "q-3"]);
    expect(pending[1]?.id).toBe("q-3");
  });

  it("returns pending rows scoped to a user", async () => {
    await repo.enqueue({ ...item, id: "q-1", userId: "u-1", createdAt: "2026-01-01T00:00:00.000Z" });
    await repo.enqueue({ ...item, id: "q-2", userId: "u-2", createdAt: "2026-01-02T00:00:00.000Z" });
    await repo.enqueue({ ...item, id: "q-3", userId: "u-1", createdAt: "2026-01-03T00:00:00.000Z" });

    const pendingU1 = await repo.getPendingForUser("u-1");
    expect(pendingU1).toHaveLength(2);
    expect(pendingU1.map((r) => r.id)).toEqual(["q-1", "q-3"]);

    const pendingU2 = await repo.getPendingForUser("u-2");
    expect(pendingU2).toHaveLength(1);
    expect(pendingU2[0]?.id).toBe("q-2");
  });

  it("marks synced rows with a timestamp", async () => {
    await repo.enqueue(item);
    await repo.markSynced(["q-1"]);

    const rows = await db.$client.getAllAsync<{
      status: string;
      synced_at: string | null;
    }>("SELECT status, synced_at FROM quiz_results WHERE id = ?", "q-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("synced");
    expect(rows[0]?.synced_at).toBeTruthy();
  });

  it("counts pending rows scoped to a user", async () => {
    await repo.enqueue({ ...item, id: "a" });
    await repo.enqueue({ ...item, id: "b", userId: "u-2" });
    await repo.enqueue({ ...item, id: "c", userId: "u-2" });

    expect(await repo.pendingCount()).toBe(3);
    expect(await repo.pendingCount("u-2")).toBe(2);
  });

  it("clears pending rows for a user", async () => {
    await repo.enqueue({ ...item, id: "a", userId: "u-1" });
    await repo.enqueue({ ...item, id: "b", userId: "u-2" });

    await repo.clearForUser("u-1");
    expect(await repo.pendingCount()).toBe(1);
    expect(await repo.pendingCount("u-2")).toBe(1);
  });

  it("purges only old synced rows, keeping pending ones", async () => {
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    await repo.enqueue(item);
    await repo.markSynced(["q-1"]);
    // Force a 40-day-old synced_at
    await db.$client.runAsync(
      "UPDATE quiz_results SET synced_at = ? WHERE id = ?",
      old,
      "q-1",
    );
    await repo.enqueue({ ...item, id: "q-pending" });

    const deleted = await repo.purgeExpired();
    expect(deleted).toBe(1);
    expect(await repo.pendingCount()).toBe(1);
  });

  it("leaves freshly synced rows within the retention window", async () => {
    await repo.enqueue(item);
    await repo.markSynced(["q-1"]);
    const deleted = await repo.purgeExpired();
    expect(deleted).toBe(0);
  });

  // ── P1-2 regression: a permanently-failing item must never block the queue ──

  it("getFlushableForUser excludes items at the retry cap but returns younger ones", async () => {
    // Bad item: has already failed 3 times (dead-lettered).
    await repo.enqueue({ ...item, id: "q-bad" });
    await repo.incrementFailure(["q-bad"]);
    await repo.incrementFailure(["q-bad"]);
    await repo.incrementFailure(["q-bad"]);

    // Good item: fresh, still below the cap.
    await repo.enqueue({ ...item, id: "q-good", createdAt: "2026-01-02T00:00:00.000Z" });

    const flushable = await repo.getFlushableForUser("u-1", 3);
    expect(flushable.map((r) => r.id)).toEqual(["q-good"]);

    // The bad item is still pending (not lost) — it just no longer blocks flush.
    const pending = await repo.getPending();
    expect(pending.map((r) => r.id).sort()).toEqual(["q-bad", "q-good"]);
  });

  it("incrementFailure caps an item after maxAttempts", async () => {
    await repo.enqueue(item);

    for (let i = 0; i < 3; i++) {
      await repo.incrementFailure(["q-1"]);
    }

    const rows = await db.$client.getAllAsync<{ failure_count: number }>(
      "SELECT failure_count FROM quiz_results WHERE id = ?",
      "q-1",
    );
    expect(rows[0]?.failure_count).toBe(3);

    // At the cap → excluded from flushable, still counted as pending.
    expect(await repo.getFlushableForUser("u-1", 3)).toHaveLength(0);
    expect(await repo.pendingCount("u-1")).toBe(1);
  });

  it("incrementFailure only touches pending rows for the given ids", async () => {
    await repo.enqueue({ ...item, id: "q-1", userId: "u-1" });
    await repo.enqueue({ ...item, id: "q-2", userId: "u-2" });

    await repo.incrementFailure(["q-1", "q-nonexistent"]);

    const rows = await db.$client.getAllAsync<{
      id: string;
      failure_count: number;
    }>("SELECT id, failure_count FROM quiz_results ORDER BY id");
    expect(rows).toEqual([
      { id: "q-1", failure_count: 1 },
      { id: "q-2", failure_count: 0 },
    ]);
  });
});