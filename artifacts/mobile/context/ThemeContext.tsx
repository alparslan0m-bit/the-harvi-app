import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";

export type ThemeMode = "harvi" | "dark" | "pink";

interface ThemeCtx {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "harvi",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("harvi");

  useEffect(() => {
    AsyncStorage.getItem("harvi:theme").then((saved) => {
      if (saved === "harvi" || saved === "dark" || saved === "pink") {
        setThemeState(saved as ThemeMode);
        if (saved === "harvi" || saved === "pink") {
          Appearance.setColorScheme("light");
        } else if (saved === "dark") {
          Appearance.setColorScheme("dark");
        }
      }
    }).catch(() => {});
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    AsyncStorage.setItem("harvi:theme", newTheme).catch(() => {});
    if (newTheme === "harvi" || newTheme === "pink") {
      Appearance.setColorScheme("light");
    } else {
      Appearance.setColorScheme("dark");
    }
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
