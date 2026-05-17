# State Generation Engine: Global Contexts, Cache Pre-Warming & Memoization

This document defines the automated stages, memory caching rules, and context optimization guidelines required by AI agents to construct highly optimized React Context state providers.

---

## 1. State Generation Workflow

Every generated React Context provider must implement the following sequential structures:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: Context Interface Definition       │
        │  Define explicit state properties & setter callbacks   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: AsyncStorage Cache Pre-warm       │
        │  Read cached progress from disk, pre-warm memory Map   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │              Stage 3: Context Memoization              │
        │  Wrap dynamic update functions inside useCallback      │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 4: Provider Render Gates             │
        │  Render children; prevent re-renders with useMemo value│
        └────────────────────────────────────────────────────────┘
```

---

## 2. Context Optimization Rules

*   **Rule 1 (Memoized Value)**: The value passed into `<Context.Provider>` must always be wrapped in a `useMemo` block. This prevents downstream children components from re-rendering each time the parent component changes:
    ```typescript
    const value = useMemo(() => ({ state, updateState }), [state, updateState]);
    ```
*   **Rule 2 (Async Pre-warming)**: On mount, standard loaders must check local AsyncStorage cache maps to display user states instantly, eliminating database fetch delay.
*   **Rule 3 (Local Hook Extractor)**: Provide an explicit, safe custom hook helper to import context files without duplicate boilerplate:
    ```typescript
    export const useSettings = () => useContext(SettingsContext);
    ```

---

## 3. Dynamic Verification Script

AI agents can verify that a newly generated context compiles correctly by running this check in a scratch file:

```typescript
// scratch/test_context_build.tsx
import React, { createContext, useContext } from "react";

const TestCtx = createContext<string | null>(null);

export function useTestContext() {
  const ctx = useContext(TestCtx);
  if (!ctx) {
    console.warn("Context check: Provider is missing in render tree!");
  }
  return ctx;
}
```

---

# Anti-Patterns to Avoid

*   **Direct Context Exports**: Exporting a raw React Context directly instead of wrapping access in a custom consumer hook helper.
    *   *Consequence*: Clutters consumer screens with duplicate imports and bypasses safety checks.
*   **Unmemoized Provider Values**: Passing raw inline objects (e.g. `value={{ state, update }}`) directly into `<Context.Provider>`.
    *   *Consequence*: Triggers complete re-renders of all child views every single time the state changes, dropping frame rates.
