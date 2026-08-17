/**
 * @file themeStore.tsx
 * @description Theme state management store.
 * Manages theme switching (e.g. standard "harvi" vs "pink" pastel theme)
 * and persists user theme preferences across app reboots via MMKV (plan.md §5).
 * MMKV reads are synchronous, so there is no async hydration ceremony.
 */
import React, { useCallback } from "react";
import { Appearance } from "react-native";
import { useMMKVString } from "react-native-mmkv";
import { storage } from "@/src/shared/storage/mmkv";

/** Supported theme identifier names */
export type ThemeMode = "harvi" | "pink";

/**
 * Hook for consuming theme state slices reactively from MMKV.
 */
export function useTheme() {
  const [themeValue, setThemeValue] = useMMKVString("theme", storage);
  
  const theme = (themeValue as ThemeMode) || "harvi";

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeValue(newTheme);
    Appearance.setColorScheme("light");
  }, [setThemeValue]);

  return { theme, setTheme };
}

/**
 * Provider component kept as a passthrough for the root layout — theme state
 * initializes synchronously from MMKV, so no hydration effect is required.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}