# State Template: Scaffolding Blueprint for React Contexts

This template provides the standard React Context structure, asynchronous local persistence managers, and RAM cache pre-warming flows required to coordinate global states in the App Factory workspace.

---

## 📂 Proposed File Path

State providers and global contexts must reside in the `context/` directory. For example:

```
c:\Users\METRO\harvi gamed\
└── context/
    └── UserPreferencesContext.tsx # Centralized State Provider
```

---

## 💻 Code Scaffolding

```tsx
// context/UserPreferencesContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── 1. EXPLICIT INTERFACE CONTRACT ──
export interface UserPreferences {
  isSoundEnabled: boolean;
  isHapticEnabled: boolean;
}

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (key: keyof UserPreferences, value: boolean) => void;
  isLoading: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  isSoundEnabled: true,
  isHapticEnabled: true,
};

// ── 2. GLOBAL CONTEXT DECLARATION ──
const PreferencesContext = createContext<PreferencesContextType>({
  preferences: DEFAULT_PREFERENCES,
  updatePreferences: () => {},
  isLoading: true,
});

// ── 3. STATE PROVIDER COMPONENT ──
export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // A. Pre-Warm Cache on Mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        const stored = await AsyncStorage.getItem("app:preferences");
        if (stored) {
          setPreferences(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to load user preferences from AsyncStorage:", err);
      } finally {
        setIsLoading(false); // Unblock rendering gates
      }
    }
    loadPreferences();
  }, []);

  // B. Memoized State Update Handler
  const updatePreferences = useCallback(async (key: keyof UserPreferences, value: boolean) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      
      // Persist to local storage in background
      AsyncStorage.setItem("app:preferences", JSON.stringify(updated)).catch((err) => {
        console.error("Failed to save user preferences to AsyncStorage:", err);
      });

      return updated;
    });
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences, isLoading }}>
      {children}
    </PreferencesContext.Provider>
  );
}

// ── 4. SAFE USECONTEXT HOOK GATER ──
export function useUserPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("useUserPreferences must be utilized inside a UserPreferencesProvider");
  }
  return context;
}
```

---

## ⚙️ Generation Rules & Best Practices

1.  **Always implement cache pre-warming**: Keep an `isLoading` gate variable inside the provider state. Block app rendering or serve fallback skeletons until the asynchronous disk cache pre-warms RAM configurations.
2.  **Memoize Context Update Handlers**: Wrap state modifier events inside `useCallback` to prevent child components using the context from re-rendering during parent updates.
3.  **Strict hook gatekeepers**: Throw a prominent runtime error inside custom context hooks if they are invoked outside matching provider bounds, assisting debugging loops.

---

## 📈 Scalability Notes

*   **Avoid Context Overload**: React Context is designed for low-frequency global updates (themes, authentication states, settings preferences). Do not put rapidly changing states (like game timers or form fields) into a global context, as it triggers full-tree re-renders. Use local shared hooks instead.
*   **RAM-Disk Sync Separation**: To achieve **zero-lag layouts**, update state references in RAM instantly, allowing AsyncStorage write executions to resolve asynchronously in background threads without blocking rendering gates.
