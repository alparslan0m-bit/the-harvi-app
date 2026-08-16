/**
 * HierarchyRepository unit tests — in-memory SQLite (plan.md §10).
 */
import { createTestDb } from "./helpers";
import { HierarchyRepository } from "../repositories/hierarchyRepository";
import type { Year } from "@/src/shared/types/schemas";

const tree: Year[] = [
  {
    id: "y-1",
    name: "Year 1",
    order: 1,
    modules: [
      {
        id: "m-1",
        name: "Module A",
        year_id: "y-1",
        order: 1,
        external_price_id: "price_1",
        subjects: [
          {
            id: "s-1",
            name: "Subject A",
            module_id: "m-1",
            order: 1,
            lectures: [
              {
                id: "lec-1",
                name: "Lecture One",
                external_id: "ext-1",
                subject_id: "s-1",
                question_count: 10,
                is_free: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "y-2",
    name: "Year 2",
    order: 2,
    modules: [],
  },
];

describe("HierarchyRepository", () => {
  let db: ReturnType<typeof createTestDb>;
  let repo: HierarchyRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new HierarchyRepository(db);
  });

  it("round-trips the full tree", async () => {
    await repo.replaceAll(tree);
    const result = await repo.getAll();

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result?.[0]?.modules[0]?.subjects[0]?.lectures[0]).toMatchObject({
      id: "lec-1",
      question_count: 10,
      is_free: true,
    });
  });

  it("preserves ordering by order field", async () => {
    await repo.replaceAll(tree);
    const result = await repo.getAll();
    expect(result?.map((y) => y.id)).toEqual(["y-1", "y-2"]);
  });

  it("returns null for an empty cache", async () => {
    expect(await repo.getAll()).toBeNull();
  });

  it("replaces the previous tree atomically", async () => {
    await repo.replaceAll(tree);
    await repo.replaceAll([
      { id: "y-new", name: "New Year", order: 1, modules: [] },
    ]);

    const result = await repo.getAll();
    expect(result).toHaveLength(1);
    expect(result?.[0]?.id).toBe("y-new");
  });

  it("clears all four tables", async () => {
    await repo.replaceAll(tree);
    await repo.clearAll();
    expect(await repo.getAll()).toBeNull();
  });
});