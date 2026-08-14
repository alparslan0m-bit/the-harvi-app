/**
 * @file themeStore.tsx
 * @description Theme state management store.
 * Manages theme switching (e.g. standard "harvi" vs "pink" pastel theme) 
 * and persists user theme preferences across app reboots via AsyncStorage.
 */
import React, { useEffect } from "react";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

/** Supported theme identifier names */
export type ThemeMode = "harvi" | "pink";

/** Interface defining theme state properties and mutation handlers */
interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => Promise<void>;
}

/**
 * Zustand store for driving global application theme selection.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  theme: "harvi",

  /**
   * Sets and persists the selected theme name to AsyncStorage.
   * 
   * @param newTheme - The target theme mode ("harvi" | "pink")
   */
  setTheme: (newTheme) => {
    set({ theme: newTheme });
    AsyncStorage.setItem("harvi:theme", newTheme).catch(() => {});
    Appearance.setColorScheme("light");
  },

  /**
   * Hydrates the persisted theme preference from disk during app launch.
   */
  initTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem("harvi:theme");
      if (saved === "harvi" || saved === "pink") {
        set({ theme: saved as ThemeMode });
        Appearance.setColorScheme("light");
      }
    } catch (e) {
      if (__DEV__) console.warn("[themeStore] Error loading theme:", e);
    }
  },
}));

/**
 * Provider component that automatically initializes theme state upon mounting.
 * Should wrap the root navigator.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initTheme = useThemeStore((s) => s.initTheme);
  useEffect(() => {
    initTheme();
  }, [initTheme]);
  return <>{children}</>;
}

/**
 * Selector hook for consuming theme state slices.
 */
export function useTheme<T>(selector: (state: ThemeState) => T): T {
  return useThemeStore(selector);
}
