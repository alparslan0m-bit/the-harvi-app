# Harvi Internal API Reference

This document provides an API reference for the core frontend services and global state stores within the Harvi mobile application.

## Global State Stores (Zustand)

Location: `src/shared/store/`

### `useAuthStore`

Manages the user authentication lifecycle and session state.

**State Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `session` | `Session \| null` | The current Supabase authentication session. |
| `user` | `User \| null` | The current authenticated user object. |
| `isLoading` | `boolean` | True if the authentication state is actively resolving. |

**Methods:**
- `signIn(email, password)`: Authenticates via email/password.
- `signUp(email, password)`: Registers a new user via Supabase.
- `signInWithGoogle()`: Initiates an OAuth flow via `expo-web-browser`.
- `signOut()`: Terminates the session and securely clears all relevant caches (progress, stats, best scores).

### `useSyncStore`

Monitors network connectivity and orchestrates the synchronization of the offline queue.

**State Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `isOnline` | `boolean` | Tracks the active network status via `NetInfo`. |
| `isSyncing` | `boolean` | True if a flush operation to Supabase is currently in progress. |
| `pendingCount` | `number` | The current number of mutations sitting in the offline queue. |

**Methods:**
- `flush()`: Attempts to drain the offline queue to Supabase. Implements a 10-second timeout and a 30-second exponential backoff on failure. Invalidates React Query caches on success.

### `usePurchaseStore`

Manages In-App Purchases (IAP) through RevenueCat.

**Methods:**
- `purchaseModule(package)`: Initiates the native Apple/Google payment flow via RevenueCat SDK. Triggers the `record-iap` Supabase edge function upon success.
- `redeemCode(code)`: Calls the `redeem_access_code` RPC on Supabase to grant content access via a promo code.
- `restorePurchases()`: Restores previous RevenueCat purchases.

---

## Core Services

Location: `src/shared/services/` (and implicitly fetched via TanStack Query)

### `progressService`

Tracks and mutates user progress across subjects and lectures.

**Methods:**
- `optimisticallyMarkComplete(lectureId)`: Instantly updates the in-memory React Query cache and persists the mutation payload to the offline queue. 
- `fetchCompletedLectures()`: Fetches the completed set of lectures, prioritizing the module-level memCache, then AsyncStorage, and finally falling back to Supabase. Merges queued offline IDs dynamically.

### `bestScoreService`

Tracks the highest quiz score a user has achieved per lecture.

**Methods:**
- `optimisticallyUpdateBestScore(lectureId, score)`: Instantly updates the in-memory cache to reflect new high scores (powering UI star ratings) and queues the mutation.
- `getBestScores()`: Fetches best scores per lecture. Implements the three-tier cache architecture.

### `hierarchyService`

Responsible for building the primary content tree.

**Methods:**
- `fetchHierarchy()`: Retrieves the Year → Module → Subject → Lecture tree from Supabase tables, auto-detecting foreign keys. Aggressively caches the full tree to AsyncStorage for instantaneous offline boot-up.

### `statsService`

Aggregates data for the user dashboard.

**Methods:**
- `getUserStatsOverview()`: Calls the `get_user_stats_overview` RPC on Supabase to calculate `total_quizzes`, `average_score`, `streak`, and `weekly_activity`. Dynamically merges pending offline queue results into the response to prevent stats from appearing "stale" while offline.

### `offlineQueue`

The raw interface for the asynchronous mutation queue.

**Methods:**
- `enqueue(payload)`: Validates the payload against a Zod schema, generates a UUID, and appends it to the `harvi:quiz_queue` AsyncStorage key.
- `getQueue()`: Retrieves the raw array of pending mutations.
- `removeSynced(uuids)`: Safely splices successfully synced mutations out of the queue.
- `clearQueueForUser()`: Erases the queue (typically called on sign-out).
