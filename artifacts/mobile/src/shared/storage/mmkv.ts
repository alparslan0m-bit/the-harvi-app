/**
 * @file mmkv.ts
 * @description Typed accessor around the MMKV `defaultStorage` instance —
 * plaintext by design (plan.md §5). Holds only non-sensitive preferences:
 * theme, avatar, display name, and the quiz FK-column resolution. No raw
 * getString/setString calls elsewhere in the codebase.
 *
 * Profile keys (avatar / displayName) are scoped per user
 * (`profile:avatar:<userId>` / `profile:displayName:<userId>`) so a shared
 * device never leaks one user's profile to the next (audit P1-5). Clear them
 * with `clearUserProfile(userId)` on sign-out.
 */
import { createMMKV } from "react-native-mmkv";
import type { ThemeMode } from "@/src/shared/store/themeStore";

export const storage = createMMKV({ id: "harvi-default" });

export const profileAvatarKey = (userId: string): string =>
  `profile:avatar:${userId}`;
export const profileDisplayNameKey = (userId: string): string =>
  `profile:displayName:${userId}`;

export const mmkv = {
  // Theme (device-level, never user-scoped)
  getTheme: (): ThemeMode | null => storage.getString("theme") as ThemeMode | null,
  setTheme: (v: ThemeMode): void => {
    storage.set("theme", v);
  },

  // Profile (per-user scoped — see header note)
  getAvatar: (userId: string): string | null =>
    storage.getString(profileAvatarKey(userId)) ?? null,
  setAvatar: (userId: string, v: string): void => {
    storage.set(profileAvatarKey(userId), v);
  },
  getDisplayName: (userId: string): string =>
    storage.getString(profileDisplayNameKey(userId)) ?? "",
  setDisplayName: (userId: string, v: string): void => {
    storage.set(profileDisplayNameKey(userId), v);
  },

  // Quiz FK column detection
  getFkCol: (): string | null => storage.getString("quiz.fkcol") ?? null,
  setFkCol: (v: string): void => {
    storage.set("quiz.fkcol", v);
  },

  // Lifecycle
  clearUserProfile: (userId: string): void => {
    storage.remove(profileAvatarKey(userId));
    storage.remove(profileDisplayNameKey(userId));
  },
} as const;