/**
 * QuestionRepository unit tests — in-memory SQLite (plan.md §10).
 */
import { createTestDb } from "./helpers";
import { QuestionRepository } from "../repositories/questionRepository";

describe("QuestionRepository", () => {
  let db: ReturnType<typeof createTestDb>;
  let repo: QuestionRepository;

  const q = {
    id: "q-1",
    lectureId: "lec-1",
    text: "What is 2+2?",
    options: JSON.stringify(["1", "2", "4", "5"]),
    answer: 2,
    explanation: "Basic arithmetic",
    imageUrl: null,
  };

  beforeEach(() => {
    db = createTestDb();
    repo = new QuestionRepository(db);
  });

  it("replaces a lecture's question bank", async () => {
    await repo.replaceLecture("lec-1", [
      q,
      { ...q, id: "q-2", text: "What is 3+3?" },
    ]);

    const rows = await repo.getByLecture("lec-1");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ lectureId: "lec-1", answer: 2 });
  });

  it("replaces existing rows for the same lecture (delete + insert)", async () => {
    await repo.replaceLecture("lec-1", [q]);
    await repo.replaceLecture("lec-1", [
      { ...q, id: "q-new", text: "Replaced" },
    ]);

    const rows = await repo.getByLecture("lec-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("q-new");
  });

  it("reads meta without the full payload", async () => {
    await repo.replaceLecture("lec-1", [q, { ...q, id: "q-2" }]);
    const meta = await repo.getMeta("lec-1");
    expect(meta?.questionCount).toBe(2);
    expect(meta?.downloadedAt).toBeTruthy();
  });

  it("returns null meta for an uncached lecture", async () => {
    expect(await repo.getMeta("lec-missing")).toBeNull();
  });

  it("clears a single lecture", async () => {
    await repo.replaceLecture("lec-1", [q]);
    await repo.replaceLecture("lec-2", [{ ...q, id: "q-2", lectureId: "lec-2" }]);

    await repo.clearLecture("lec-1");
    expect(await repo.getByLecture("lec-1")).toHaveLength(0);
    expect(await repo.getByLecture("lec-2")).toHaveLength(1);
  });

  it("clears all lectures and counts distinct ones", async () => {
    await repo.replaceLecture("lec-1", [q]);
    await repo.replaceLecture("lec-2", [{ ...q, id: "q-2", lectureId: "lec-2" }]);

    expect(await repo.countLectures()).toBe(2);
    await repo.clearAll();
    expect(await repo.countLectures()).toBe(0);
  });
});