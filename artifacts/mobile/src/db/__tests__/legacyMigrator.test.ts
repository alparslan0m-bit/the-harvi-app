/**
 * legacyMigrator unit tests — happy path, empty mockStore, idempotency, and
 * corrupt-payload quarantine (plan.md §10).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTestDb } from "./helpers";
import { runLegacyMigration } from "../legacyMigrator";
import { mmkv } from "@/src/shared/storage/mmkv";

const mockStore = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getAllKeys: jest.fn(async () => Array.from(mockStore.keys())),
    multiGet: jest.fn(async (keys: string[]) =>
      keys.map((k) => [k, mockStore.get(k) ?? null] as [string, string | null]),
    ),
  },
}));

beforeEach(() => {
  mockStore.clear();
});

function seed(kv: Record<string, string>): void {
  for (const [k, v] of Object.entries(kv)) {
    mockStore.set(k, v);
  }
}

describe("runLegacyMigration", () => {
  it("is a no-op on an empty mockStore and sets the flag", async () => {
    const db = createTestDb();
    await runLegacyMigration(db);

    const flag = await db.$client.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ?",
      "async_migration_v1_done",
    );
    expect(flag?.value).toBeTruthy();
  });

  it("seeds the question_cache_version gate", async () => {
    const db = createTestDb();
    await runLegacyMigration(db);

    const gate = await db.$client.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ?",
      "question_cache_version",
    );
    expect(gate?.value).toBe("v3");
  });

  it("migrates the queue into pending quiz_results rows", async () => {
    seed({
      "harvi:quiz_queue": JSON.stringify([
        {
          localId: "abc",
          userId: "u-1",
          lectureId: "lec-1",
          score: 80,
          totalQuestions: 10,
          correctAnswers: 8,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    });
    const db = createTestDb();
    await runLegacyMigration(db);

    const rows = await db.$client.getAllAsync<{ id: string; status: string }>(
      "SELECT id, status FROM quiz_results",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ id: "abc", status: "pending" });
  });

  it("migrates hierarchy into the four tables", async () => {
    seed({
      "harvi:hierarchy": JSON.stringify([
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
              subjects: [
                {
                  id: "s-1",
                  name: "Subject A",
                  module_id: "m-1",
                  order: 1,
                  lectures: [
                    {
                      id: "lec-1",
                      name: "L1",
                      external_id: "e1",
                      subject_id: "s-1",
                      question_count: 5,
                      is_free: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    });
    const db = createTestDb();
    await runLegacyMigration(db);

    const lectures = await db.$client.getAllAsync<{ id: string }>(
      "SELECT id FROM hierarchy_lectures",
    );
    expect(lectures).toHaveLength(1);
    expect(lectures[0]?.id).toBe("lec-1");
  });

  it("migrates global prefs into MMKV", async () => {
    seed({
      "harvi:theme": "pink",
      "harvi:avatar": "doctor-1",
      "harvi:displayName": "Metro",
      "harvi:quiz:fkcol": "lecture_id",
    });
    const db = createTestDb();
    await runLegacyMigration(db);

    expect(mmkv.getTheme()).toBe("pink");
    expect(mmkv.getAvatar()).toBe("doctor-1");
    expect(mmkv.getDisplayName()).toBe("Metro");
    expect(mmkv.getFkCol()).toBe("lecture_id");
  });

  it("is idempotent — a second run does not duplicate rows", async () => {
    seed({
      "harvi:quiz_queue": JSON.stringify([
        {
          localId: "abc",
          userId: "u-1",
          lectureId: "lec-1",
          score: 80,
          totalQuestions: 10,
          correctAnswers: 8,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    });
    const db = createTestDb();
    await runLegacyMigration(db);
    await runLegacyMigration(db);

    const rows = await db.$client.getAllAsync<{ id: string }>(
      "SELECT id FROM quiz_results",
    );
    expect(rows).toHaveLength(1);
  });

  it("quarantines a corrupt queue payload instead of dropping it", async () => {
    seed({ "harvi:quiz_queue": "{ this is not valid json !!" });
    const db = createTestDb();
    await runLegacyMigration(db);

    const quarantine = await db.$client.getAllAsync<{ source_key: string }>(
      "SELECT source_key FROM migration_quarantine",
    );
    expect(quarantine).toHaveLength(1);
    expect(quarantine[0]?.source_key).toBe("harvi:quiz_queue");
  });

  it("continues past a corrupt key and still migrates healthy ones", async () => {
    seed({
      "harvi:quiz_queue": "{ not valid json",
      "harvi:theme": "harvi",
    });
    const db = createTestDb();
    await runLegacyMigration(db);

    const quarantine = await db.$client.getAllAsync<{ source_key: string }>(
      "SELECT source_key FROM migration_quarantine",
    );
    expect(quarantine).toHaveLength(1);
    expect(mmkv.getTheme()).toBe("harvi");
  });
});