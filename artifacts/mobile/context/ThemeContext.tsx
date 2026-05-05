import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";

export type ThemeMode = "light" | "dark" | "system" | "pink";

interface ThemeCtx {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "system",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem("harvi:theme").then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system" || saved === "pink") {
        setThemeState(saved as ThemeMode);
        if (saved === "light" || saved === "pink") {
          Appearance.setColorScheme("light");
        } else if (saved === "dark") {
          Appearance.setColorScheme("dark");
        } else {
          Appearance.setColorScheme(null);
        }
      }
    }).catch(() => {});
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    AsyncStorage.setItem("harvi:theme", newTheme).catch(() => {});
    if (newTheme === "system") {
      Appearance.setColorScheme(null);
    } else if (newTheme === "pink") {
      Appearance.setColorScheme("light");
    } else {
      Appearance.setColorScheme(newTheme);
    }
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
