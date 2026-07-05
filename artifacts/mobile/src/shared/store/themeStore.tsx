import React, { useEffect } from "react";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

export type ThemeMode = "harvi" | "dark" | "pink";

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "harvi",
  setTheme: (newTheme) => {
    set({ theme: newTheme });
    AsyncStorage.setItem("harvi:theme", newTheme).catch(() => {});
    Appearance.setColorScheme(newTheme === "harvi" || newTheme === "pink" ? "light" : "dark");
  },
  initTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem("harvi:theme");
      if (saved === "harvi" || saved === "dark" || saved === "pink") {
        set({ theme: saved as ThemeMode });
        Appearance.setColorScheme(saved === "harvi" || saved === "pink" ? "light" : "dark");
      }
    } catch {}
  }
}));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initTheme = useThemeStore((s) => s.initTheme);
  useEffect(() => {
    initTheme();
  }, [initTheme]);
  return <>{children}</>;
}

export function useTheme() {
  return useThemeStore();
}
