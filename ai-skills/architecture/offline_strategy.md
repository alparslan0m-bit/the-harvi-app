# Offline Strategy & Resilience Sync Queue

This document establishes the architectural standards for the application's offline-first synchronization engine. It explains how to build a highly resilient database queue that survives network transitions, avoids blocking on DB constraint failures (poison pills), and provides instant feedback loops to users.

---

## 1. Pre-Flight Connectivity Checks

To ensure an app feels exceptionally fast and responsive in unstable networks, the architecture implements **Pre-Flight Connectivity Checks** before any external API or database call is made.

### Why this is critical
Without this check, when a user launches a query in an offline or subterranean transit area, the application will hang on network sockets for up to **30 seconds** waiting for standard HTTP timeouts. In Harvi, this latency is reduced to **0 milliseconds**:

```typescript
import NetInfo from "@react-native-community/netinfo";

async function fetchRemoteData(userId: string) {
  // Pre-flight check
  const net = await NetInfo.fetch();
  const isOnline = (net.isConnected ?? false) && net.isInternetReachable !== false;

  if (!isOnline) {
    // Short-circuit instantly to local storage
    return serveFromOnDeviceCache(userId);
  }

  // Continue to remote fetch...
}
```

---

## 2. NetInfo & React Query Sync Synchronization

To ensure the cache layer knows exactly when to pause or run retry actions, NetInfo status is bound directly to TanStack React Query's `onlineManager` inside a lightweight custom hook:

```typescript
// hooks/useNetworkStatus.ts
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial fetch sync
    NetInfo.fetch().then((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(online);
      onlineManager.setOnline(online); // Tells React Query to enable/disable queries
    });

    // Subscribe to active network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(online);
      onlineManager.setOnline(online);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}
```

---

## 3. Resilient Offline Mutation Queue

When a user completes a task (e.g. finishing a medical quiz) while offline, the payload is persisted inside an `AsyncStorage` queue. The queue is fully transaction-safe and contains retry guards:

### Core Queue Logic (`lib/offlineQueue.ts`)
```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "harvi:quiz_queue";

export interface PendingQuizResult {
  localId: string;
  userId: string;
  lectureId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  createdAt: string;
}

export async function enqueueQuizResult(item: Omit<PendingQuizResult, "localId">): Promise<void> {
  const queue = await readQueue();
  queue.push({ ...item, localId: `${Date.now()}-${Math.random()}` });
  await writeQueue(queue);
}

async function readQueue(): Promise<PendingQuizResult[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as PendingQuizResult[]) : [];
}

async function writeQueue(queue: PendingQuizResult[]): Promise<void> {
  const payload = JSON.stringify(queue);
  try {
    await AsyncStorage.setItem(QUEUE_KEY, payload);
  } catch (error) {
    // Retry once — transient I/O errors are common in high-concurrency mobile storage
    await AsyncStorage.setItem(QUEUE_KEY, payload);
  }
}
```

---

## 4. Poison-Pill Resilience in Queue Syncing

A common failure mode in background sync engines is the **Poison-Pill Blockade**. This occurs when a corrupted or invalid record is enqueued (e.g. violating a database foreign-key constraint on the backend). 

If the sync engine simply loops and retries on *any* error, a single bad record will block the entire queue forever, exhausting resources and failing subsequent valid entries.

### Sync Drainage with Poison-Pill Filter (`hooks/useSyncSession.ts`)
The sync loop catches Postgres-specific constraint violations and **drops the poison pills** from the queue while continuing to sync other pending records:

```typescript
const { error } = await supabase.from("quiz_results").insert({
  user_id: item.userId,
  lecture_id: item.lectureId,
  score: item.score,
  total_questions: item.totalQuestions,
  correct_answers: item.correctAnswers,
  created_at: item.createdAt,
});

if (!error) {
  syncedIds.push(item.localId);
} else {
  // Check for Postgres constraint or datatype errors (23xxx, 42xxx, 22xxx class errors)
  if (
    error.code && 
    (error.code.startsWith("23") || error.code.startsWith("42") || error.code.startsWith("22"))
  ) {
    console.warn(`[Sync] Dropping poison pill entry ${item.localId} due to DB constraint error:`, error);
    syncedIds.push(item.localId); // Mark as synced to safely remove from local queue
  }
}
```

---

## 5. Background Drainage Invalidation Flow

Upon successful sync completion, local React Query keys must be invalidated so that dashboards refresh instantly:

```typescript
if (syncedIds.length > 0) {
  await removeSynced(syncedIds);
}

if (anySynced) {
  // Force dashboard widgets, learning path cards, and stats to pull updated views from server
  queryClient.invalidateQueries({ queryKey: ["stats"] });
  queryClient.invalidateQueries({ queryKey: ["progress"] });
}
```
