/**
 * @file themeStore.tsx
 * @description Theme state management store.
 * Manages theme switching (e.g. standard "harvi" vs "pink" pastel theme)
 * and persists user theme preferences across app reboots via MMKV (plan.md §5).
 * MMKV reads are synchronous, so there is no async hydration ceremony.
 */
import React from "react";
import { create } from "zustand";
import { Appearance } from "react-native";
import { mmkv } from "@/src/shared/storage/mmkv";

/** Supported theme identifier names */
export type ThemeMode = "harvi" | "pink";

/** Interface defining theme state properties and mutation handlers */
interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

/**
 * Zustand store for driving global application theme selection.
 * Initial state is read synchronously from MMKV — no flash on cold start.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  theme: mmkv.getTheme() ?? "harvi",

  /**
   * Sets and persists the selected theme name to MMKV.
   *
   * @param newTheme - The target theme mode ("harvi" | "pink")
   */
  setTheme: (newTheme) => {
    set({ theme: newTheme });
    mmkv.setTheme(newTheme);
    Appearance.setColorScheme("light");
  },
}));

/**
 * Provider component kept as a passthrough for the root layout — theme state
 * initializes synchronously from MMKV, so no hydration effect is required.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Selector hook for consuming theme state slices.
 */
export function useTheme<T>(selector: (state: ThemeState) => T): T {
  return useThemeStore(selector);
}