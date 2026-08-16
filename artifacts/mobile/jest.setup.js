/**
 * Jest setup for the Harvi mobile test suite.
 * Mocks native modules that require JSI / native runtime (MMKV, expo-sqlite)
 * so tests can run headlessly in Node. Repositories are exercised against
 * real in-memory SQLite via better-sqlite3 + drizzle-orm/better-sqlite3,
 * sharing the driver-agnostic schema module (plan.md §10).
 */

// ── react-native-mmkv (JSI native) ───────────────────────────────────────────
const mmkvStore = new Map();
const mockMMKV = {
  getString: jest.fn((key) => {
    const v = mmkvStore.get(key);
    return typeof v === "string" ? v : undefined;
  }),
  getBoolean: jest.fn((key) => {
    const v = mmkvStore.get(key);
    return typeof v === "boolean" ? v : undefined;
  }),
  getNumber: jest.fn((key) => {
    const v = mmkvStore.get(key);
    return typeof v === "number" ? v : undefined;
  }),
  set: jest.fn((key, value) => {
    mmkvStore.set(key, value);
  }),
  remove: jest.fn((key) => mmkvStore.delete(key)),
  clearAll: jest.fn(() => mmkvStore.clear()),
  contains: jest.fn((key) => mmkvStore.has(key)),
  getAllKeys: jest.fn(() => Array.from(mmkvStore.keys())),
};

jest.mock("react-native-mmkv", () => ({
  createMMKV: jest.fn(() => mockMMKV),
  useMMKV: jest.fn(() => mockMMKV),
  useMMKVString: jest.fn(() => ["", jest.fn()]),
  useMMKVNumber: jest.fn(() => [0, jest.fn()]),
  useMMKVBoolean: jest.fn(() => [false, jest.fn()]),
  useMMKVObject: jest.fn(() => [null, jest.fn()]),
  existsMMKV: jest.fn(() => false),
  deleteMMKV: jest.fn(),
}));

// ── expo-sqlite (native) ─────────────────────────────────────────────────────
jest.mock("expo-sqlite", () => ({
  __esModule: true,
  SQLiteProvider: ({ children }) => children,
  openDatabaseAsync: jest.fn(async () => {
    throw new Error(
      "expo-sqlite openDatabaseAsync is mocked — use better-sqlite3 in repository tests",
    );
  }),
  openDatabaseSync: jest.fn(() => {
    throw new Error(
      "expo-sqlite openDatabaseSync is mocked — use better-sqlite3 in repository tests",
    );
  }),
}));