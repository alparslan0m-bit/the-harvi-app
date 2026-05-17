# Color System & Dynamic Triple-Theming

This document details the dynamic multi-theme engine of the Harvi application. It explains how to structure color palettes, manage theming states, and implement custom theme selection (Light/Dark/Pink) that renders instantly without app reload.

---

## 1. Dynamic Color Palettes Definition

Rather than hardcoding styling colors inside components, Harvi structures colors as semantic design tokens. The application supports three complete themes defined in `constants/colors.ts`:

1.  **Light Theme ("harvi")**: High-clarity medical slate theme using a deep sky-blue tint (`#0ea5e9`).
2.  **Dark Theme ("dark")**: A premium midnight slate palette using a dark background (`#0f172a`), deep slate cards (`#1e293b`), and bright sky blue accents (`#38bdf8`).
3.  **Pink Theme ("pink")**: A friendly rose theme utilizing soft pink backgrounds (`#fff1f2`) and vibrant raspberry tints (`#db2777`).

---

## 2. Core Palette Structure (`constants/colors.ts`)

```typescript
const colors = {
  light: {
    text: "#0a0a0a",
    tint: "#0ea5e9",
    background: "#ffffff",
    card: "#f8fafc",
    primary: "#0ea5e9",
    primaryForeground: "#ffffff",
    secondary: "#f1f5f9",
    mutedForeground: "#94a3b8",
    destructive: "#ef4444",
    border: "#e2e8f0",
    success: "#10b981",
    warning: "#f59e0b",
  },
  dark: {
    text: "#F1F5F9",
    tint: "#38bdf8",
    background: "#0f172a", // Midnight Slate
    card: "#1e293b",       // Slate card
    primary: "#38bdf8",
    primaryForeground: "#ffffff",
    secondary: "#334155",
    mutedForeground: "#94a3b8",
    destructive: "#f43f5e",
    border: "#334155",
    success: "#10b981",
    warning: "#f59e0b",
  },
  pink: {
    text: "#27272a",
    tint: "#db2777",
    background: "#fff1f2",
    card: "#ffffff",
    primary: "#db2777",
    primaryForeground: "#ffffff",
    secondary: "#fce7f3",
    mutedForeground: "#be185d",
    destructive: "#ef4444",
    border: "#fbcfe8",
    success: "#10b981",
    warning: "#f59e0b",
  },
  radius: 24,
  yearGradients: [
    ["#0ea5e9", "#0284c7"],
    ["#10b981", "#059669"],
    ["#f59e0b", "#d97706"],
  ],
};

export default colors;
```

---

## 3. The Theme Context Provider

The system state is coordinated via a lightweight `ThemeContext.tsx` that persists selected themes on-device and synchronizes them with Expo's system-level `Appearance` settings:

```typescript
// context/ThemeContext.tsx
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
    AsyncStorage.getItem("app:theme").then((saved) => {
      if (saved === "harvi" || saved === "dark" || saved === "pink") {
        setThemeState(saved as ThemeMode);
        Appearance.setColorScheme(saved === "dark" ? "dark" : "light");
      }
    }).catch(() => {});
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    AsyncStorage.setItem("app:theme", newTheme).catch(() => {});
    Appearance.setColorScheme(newTheme === "dark" ? "dark" : "light");
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
```

---

## 4. Querying Active Themes (`hooks/useColors.ts`)

Components must never parse raw context state directly. Instead, they fetch theme properties through the custom `useColors` hook, which maps the `"harvi"` string to `"light"` and returns matching tokens:

```typescript
// hooks/useColors.ts
import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { theme } = useTheme();

  // Map semantic logo theme "harvi" to light colors array
  const activeTheme = theme === "harvi" ? "light" : theme;
  
  const palette = (colors as any)[activeTheme] || colors.light;

  return { 
    ...palette, 
    radius: colors.radius,
    yearGradients: colors.yearGradients 
  };
}
```

---

## 5. Usage standards in UI Styling

*   **Destructure hook directly in render**:
    ```typescript
    export default function MyButton() {
      const colors = useColors();
      return (
        <View style={{ backgroundColor: colors.background, borderColor: colors.border }}>
          <Text style={{ color: colors.text }}>Submit</Text>
        </View>
      );
    }
    ```
*   **Handle Transparent Overlays**: For transparent alerts, multiply base colors using alpha channels:
    ```typescript
    style={{
      backgroundColor: colors.destructive + "1A", // Adds 10% opacity border card
      borderColor: colors.destructive + "33"      // Adds 20% opacity border line
    }}
    ```
*   **No Raw Hex Strings in Files**: Any hex color string must be added to the centralized `colors.ts` configuration, not inside individual styling sheets.
