# Caching Strategy & Zero-Flicker Architecture

This document details the dual-layer caching strategy that provides instant, flicker-free UI transitions in the Harvi application. Future AI agents must follow this caching model to maintain sub-millisecond page rendering and native-grade user experiences.

---

## 1. The Flicker Challenge on Mobile

Standard mobile caching implementations using only asynchronous local databases (like `AsyncStorage` or SQLite) introduce a noticeable **UX flicker** during screen navigation:

```
[Screen Mount] ──► 1. Render Loading State (Blank or Spinner) ──► 2. Await Storage Resolve (100–300ms) ──► 3. Render Data
```
This loading transition breaks the premium feel of the app. In Harvi, this challenge is solved by combining **in-memory Maps** with **background queries**, ensuring that views display last-known data *instantly and synchronously* upon mounting.

---

## 2. Dual-Layer Caching Blueprint

The cache architecture consists of two distinct layers:
1.  **Memory Cache Layer (`memCache`)**: A module-level ES6 Map residing in RAM. Resolves synchronously in **0 milliseconds**. Survives screen transitions and unmounts, and is cleared only upon full app restart.
2.  **Persistent Storage Layer (`AsyncStorage`)**: A persistent database on disk. Resolves asynchronously. Survives system reboots and app force-closes.

```
                  ┌─────────────────────────────────────────┐
                  │          Component Request Data         │
                  └────────────────────┬────────────────────┘
                                       │
                    Is data in RAM memCache Map?
                    ├──► [YES] ──► 1. Serve Instantly & Synchronously
                    │              2. Run background refresh if stale
                    │
                    └──► [NO]  ──► 1. Async Load from AsyncStorage disk
                                   2. Set memCache RAM Map
                                   3. Render & Run background refresh
```

---

## 3. Implementation of the Dual-Layer Pattern

The following pattern is extracted from Harvi's `useProgress.ts` and `useStats.ts` hooks:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

const CACHE_KEY = (uid: string) => `app:stats:${uid}`;

// ── 1. Module-level RAM Memory Cache ──
const memCache = new Map<string, UserStats>();
const warmed = new Set<string>();

// ── 2. Async Storage Warmup Handler ──
async function warmMemCache(userId: string): Promise<void> {
  if (warmed.has(userId)) return;
  warmed.add(userId);
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(userId));
    if (raw && !memCache.has(userId)) {
      memCache.set(userId, JSON.parse(raw) as UserStats);
    }
  } catch {
    // Ignore storage parse errors gracefully
  }
}

// ── 3. The Hook Interface ──
export function useStats(userId: string | undefined) {
  // Fire-and-forget memory warmup on hook invocation (executed before React Query triggers)
  if (userId && !warmed.has(userId)) {
    warmMemCache(userId);
  }

  // Fetch synchronous data from memory Map
  const memData = userId ? memCache.get(userId) : undefined;

  return useQuery({
    queryKey: ["stats", userId],
    queryFn: () => fetchRemoteStats(userId!),
    enabled: !!userId,
    
    // RENDER TRICK: Serve memory data instantly as React Query's initialData
    initialData: memData,
    
    // Treat memory data as stale after 11 minutes to ensure a background refresh occurs
    initialDataUpdatedAt: memData ? Date.now() - 1000 * 60 * 11 : undefined,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24, // Keeps query in memory for the entire app session
    networkMode: "offlineFirst", // Executes query function even when offline
    retry: 0,
  });
}
```

---

## 4. Key Configurations for TanStack React Query

To enforce this architecture, the root `QueryClient` must set matching parameters inside the root `_layout.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep caches alive in RAM for 24 hours
      gcTime: 1000 * 60 * 60 * 24, 
      
      // Allow local query parsing and fallback execution without network
      networkMode: "offlineFirst", 
      
      // Keep query retrievals snappy by minimizing retries
      retry: 1, 
    },
  },
});
```

---

## 5. Architectural Rules & Best Practices

1.  **Synchronous Warming**: Call memory warmups immediately inside the body of custom hooks, before any `useEffect` runs. This ensures RAM values are loaded and returned on the very first render pass.
2.  **Best-Effort Storage Writes**: Always wrap `AsyncStorage.setItem` operations in `try/catch` blocks. If a device has storage quota issues or full disks, the app should continue to work seamlessly in RAM instead of crashing.
3.  **Correct Cache Clearing**: When implementing features like "Clear History" or "Sign Out", developers must clear **both** the memory map and the disk storage:
    ```typescript
    export async function clearStatsCache(userId: string) {
      await AsyncStorage.removeItem(CACHE_KEY(userId));
      memCache.delete(userId);
      warmed.delete(userId);
    }
    ```
