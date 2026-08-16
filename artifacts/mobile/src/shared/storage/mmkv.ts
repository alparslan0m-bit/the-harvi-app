/**
 * @file mmkv.ts
 * @description Typed accessor around the MMKV `defaultStorage` instance —
 * plaintext by design (plan.md §5). Holds only non-sensitive preferences:
 * theme, avatar, display name, and the quiz FK-column resolution. No raw
 * getString/setString calls elsewhere in the codebase.
 *
 * Per-user encrypted instances are deferred — add `createUserStorage(userId)`
 * only when the first user-scoped flag lands (§5, §12).
 */
import { createMMKV } from "react-native-mmkv";
import type { ThemeMode } from "@/src/shared/store/themeStore";

const storage = createMMKV({ id: "harvi-default" });

export const mmkv = {
  // Theme
  getTheme: (): ThemeMode | null => storage.getString("theme") as ThemeMode | null,
  setTheme: (v: ThemeMode): void => {
    storage.set("theme", v);
  },

  // Profile
  getAvatar: (): string | null => storage.getString("avatar") ?? null,
  setAvatar: (v: string): void => {
    storage.set("avatar", v);
  },
  getDisplayName: (): string => storage.getString("displayName") ?? "",
  setDisplayName: (v: string): void => {
    storage.set("displayName", v);
  },

  // Quiz FK column detection
  getFkCol: (): string | null => storage.getString("quiz.fkcol") ?? null,
  setFkCol: (v: string): void => {
    storage.set("quiz.fkcol", v);
  },

  // Lifecycle
  clearAll: (): void => {
    storage.clearAll();
  },
} as const;