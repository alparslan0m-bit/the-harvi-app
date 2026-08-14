# State Management & Offline-First Strategy

Harvi is built with a robust, offline-first architecture. It guarantees that users can interact with learning content, complete quizzes, and view progress even when entirely disconnected from the internet. To achieve this, Harvi employs a sophisticated state management layer blending **Zustand**, **TanStack React Query**, and **AsyncStorage**.

This document outlines how state flows through the application and how synchronization is handled.

## The Three-Tier Caching Architecture

When fetching or mutating data (like subject progress or quiz scores), Harvi relies on three sequential layers:

1. **In-Memory Cache (Zustand & React Query)**
   - **What it is**: The fastest layer, holding the immediate active session data.
   - **How it works**: Queries are cached in memory using `React Query` (with a 24-hour `gcTime`), while active synchronous state (like user settings, theme, and short-term stats caching) lives in `Zustand`.
   - **Benefit**: Instant UI updates and transitions.

2. **Persistent Storage (AsyncStorage)**
   - **What it is**: The disk-level cache that persists across app restarts.
   - **How it works**: The app aggressively caches Supabase responses into `AsyncStorage`. If the user opens the app without an internet connection, Harvi populates the in-memory stores directly from `AsyncStorage`.
   - **Benefit**: Enables "cold boot" offline capabilities.

3. **Remote Ground Truth (Supabase)**
   - **What it is**: The authoritative, remote Postgres database.
   - **How it works**: When online, the app fetches data from Supabase, updates both the `AsyncStorage` cache and the `React Query` memory cache simultaneously.

## Data Fetching with TanStack Query

Harvi relies heavily on `TanStack React Query` for remote data fetching. 

### Global Configuration
The global `QueryClient` is configured with:
- `networkMode: 'offlineFirst'`: Ensures that queries behave predictably when offline and retry intelligently.
- `gcTime: 1000 * 60 * 60 * 24`: Retains cache data in memory for 24 hours.
- `retry: 1`: Limits retries to prevent battery drain on flaky connections.

### Key Query Domains
- `hierarchy`: Year → Module → Subject → Lecture tree
- `progress`: Completed lectures
- `bestScores`: Best quiz scores per lecture
- `stats`: Aggregated user statistics
- `content_access`: Access map based on purchases

## The Offline Queue Mechanism

Handling offline reads is handled by caching, but handling offline *writes* requires the **Offline Queue**.

### Optimistic Updates
When a user completes a quiz offline:
1. The app instantly updates the `React Query` cache (using `optimisticallyUpdateBestScore` and `optimisticallyMarkComplete`).
2. The UI instantly reflects the new score and mastery stars.
3. The mutation payload is pushed into the `offline_queue`.

### The Queue Structure (`offlineQueue.ts`)
The offline queue uses `AsyncStorage` (`harvi:quiz_queue`) to store pending mutations. 
- **Deduplication**: Every payload generates a unique UUID.
- **Validation**: Payloads are strictly validated using `Zod` (e.g., `PendingQuizResultSchema`) before entering the queue to prevent corrupted syncs later.

### Sync Store & Flushing (`syncStore.tsx`)
The `syncStore` orchestrates the drainage of the offline queue to Supabase.
- **Network Awareness**: It subscribes to `NetInfo`. The moment connectivity is restored, it triggers a `flush()`.
- **Timeouts & Backoff**: Flush attempts have a 10-second timeout. If a flush fails, it applies a 30-second exponential backoff before retrying to respect rate limits and battery life.
- **Reconciliation**: Once the queue is successfully drained to Supabase, `syncStore` invalidates the relevant React Query keys (like `stats` and `progress`) to pull down the definitive remote state and reconcile any differences.

## Global Application State (Zustand)

While React Query handles server state, **Zustand** is used for global client state.

- `authStore`: Manages the user session state (`signIn`, `signOut`, `signInWithGoogle`). Clears sensitive caches on sign-out.
- `themeStore`: Manages light/dark/custom theme preferences, persisting to `AsyncStorage`.
- `purchaseStore`: Interfaces with `RevenueCat` to manage IAP flows and module unlocks.
- `cacheStore`: A purely synchronous, in-memory cache layer for tracking session-specific flags (like `questionCacheBypassed`) and warmed stats.

## Summary Flow: Completing a Quiz Offline

1. User finishes quiz.
2. `best_score_service` triggers an optimistic update to React Query cache. UI updates instantly.
3. Payload is appended to `AsyncStorage` (`harvi:quiz_queue`).
4. User regains Wi-Fi.
5. `NetInfo` alerts `syncStore`.
6. `syncStore.flush()` reads the queue and POSTs to Supabase.
7. Supabase responds with 200 OK.
8. Queue is cleared.
9. React Query invalidates the `stats` key, triggering a background refetch to ensure perfect sync.
