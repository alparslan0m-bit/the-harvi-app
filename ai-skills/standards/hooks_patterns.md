# Hooks Patterns: Custom Hooks & Logic Containers

This document defines standard patterns, structures, and best practices for creating and extending custom React hooks inside the Harvi workspace.

---

## 1. Custom Hook Architecture

Custom hooks inside Harvi are utilized as **pure logic controllers** that isolate screen states, database transactions, caching warming loops, and animation values from the visual presentation layer.

### Rationale
*   **Decoupled testing**: Isolating state workflows in a hook allows developers to audit database and timing routines without mounting native screens.
*   **Visual separation**: Components remain thin, readable, and focused purely on design layouts.

---

## 2. Standard State Controller Hook (`hooks/useQuizSession.ts`)

Every custom hook managing dynamic screen workflows must export structured state variables and explicit update handlers, preventing components from updating states directly:

```typescript
import { useState, useCallback } from "react";

export function useCounter(initialVal = 0) {
  const [count, setCount] = useState(initialVal);

  const increment = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount((c) => Math.max(0, c - 1));
  }, []);

  const reset = useCallback(() => {
    setCount(initialVal);
  }, [initialVal]);

  return {
    count,
    increment,
    decrement,
    reset,
  };
}
```

---

## 3. Pre-Warming Memory Cache in Hooks

Custom hooks that fetch data from local disk storage must implement synchronous pre-warming on mount to avoid loading flicker:

```typescript
const memCache = new Map<string, any>();
const warmedIds = new Set<string>();

async function warmCache(id: string) {
  if (warmedIds.has(id)) return;
  warmedIds.add(id);
  const data = await AsyncStorage.getItem(`cache:${id}`);
  if (data) memCache.set(id, JSON.parse(data));
}

export function useCachedData(id: string) {
  // Pre-warm RAM cache immediately
  if (id && !warmedIds.has(id)) {
    warmCache(id);
  }

  // Synchronously serve RAM cache on first render pass
  const localData = id ? memCache.get(id) : null;

  return useQuery({
    queryKey: ["data", id],
    queryFn: () => fetchRemote(id),
    initialData: localData,
  });
}
```

---

## 4. Hooks Design Guidelines

1.  **Always use `useCallback` for event handlers**: All event callbacks returned by a hook (e.g. `onPress`, `onSubmit`, `onToggle`) must be wrapped inside `useCallback` hooks. This prevents child presentation components from re-rendering unnecessarily due to hook-instantiated function reference shifts.
2.  **Explicit Hook Returns**: Hooks must return structured objects, not arrays (except for standard simple hook setups like `useState`). Objects allow future expansion (adding new variables or methods) without breaking existing component imports.
3.  **Localize Side Effects**: Keep side effects (`useEffect` calls) closely focused and declare cleanups (like clearing timeouts, intervals, or event listeners) to prevent memory leaks in long-running apps.
