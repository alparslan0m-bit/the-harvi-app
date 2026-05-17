# State Management & Global Context Architecture

This document defines the state management standard of the Harvi application. It explains how to maintain a highly performant mobile app without heavy, complex state management libraries (like Redux or Zustand) by combining native React Contexts for global settings with TanStack React Query for data cache synchronization.

---

## 1. State Management Philosophy

Harvi adheres strictly to a **Minimalist State Philosophy**:
1.  **Server/Database State**: Managed entirely by **TanStack React Query**. React Query acts as the global cache, handling network queries, offline caching, and automatic refetches.
2.  **App/Global Configuration**: Managed using native **React Contexts** (`AuthContext`, `ThemeContext`, `SyncContext`). These are kept thin and focused purely on credentials, active layout themes, and sync states.
3.  **Screen/Feature State**: Encapsulated in custom hooks and local `useState` hooks. Screens never expose direct state modifications; all state is controlled through hook handlers.

---

## 2. Global Provider Setup Hierarchy

All global state contexts are registered at the root layout of the application (`app/_layout.tsx`). The registration order wraps providers by dependency:

```typescript
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ThemeProvider>
                <AuthProvider>
                  <SyncProvider>
                    <RootLayoutNav />
                  </SyncProvider>
                </AuthProvider>
              </ThemeProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
```

---

## 3. Creating a Standard React Context

Custom global contexts must follow the clean structure seen in `ThemeContext.tsx`. They must provide safe defaults and simple methods:

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
      if (saved) {
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

export function useTheme() {
  return useContext(Ctx);
}
```

---

## 4. Query Cache Invalidation Patterns

When a user triggers an action that mutates backend state (such as completing a quiz or purchasing a module), the app does not run manual state insertions in a global store. Instead, it **invalidates React Query keys**, which automatically drains clean data into views:

### Invalidation Example (`hooks/usePurchase.ts`)
```typescript
import { useQueryClient } from "@tanstack/react-query";

export function usePurchase() {
  const queryClient = useQueryClient();

  const handlePurchaseComplete = async () => {
    // Invalidate keys to force background queries to refresh matching data
    await queryClient.invalidateQueries({ queryKey: ["module_access"] });
    await queryClient.invalidateQueries({ queryKey: ["hierarchy"] });
    await queryClient.invalidateQueries({ queryKey: ["quiz"] });
  };
}
```

---

## 5. Architectural Rules & Anti-Patterns

*   **No Multi-Purpose Contexts**: Keep contexts atomic. Do not create a single `AppContext` that houses user profiles, active quizzes, layout dimensions, and networks status all in one file. This triggers huge re-render trees for unrelated components.
*   **Context for Read-Only or Low-Frequency Changes**: Native Context is perfect for low-frequency changes (changing a theme, signing in, network toggle). For high-frequency changes (inputs, game loops, slider movements), use local states or Reanimated shared values.
*   **Provide Default Context Values**: Always initialize `createContext` with valid dummy fallback values instead of `null` or `undefined`. This prevents apps from throwing crash errors during testing or mock render setups.
