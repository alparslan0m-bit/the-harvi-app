---
name: offline-first
description: >
  Architects and implements an offline-first mobile app experience. Ensures seamless 
  functionality, data caching, background syncing, and optimistic UI updates without a network connection.
  Trigger this skill whenever the user says "make it offline first", "add offline support", 
  "handle network drops", or "cache this data locally".
---

# Offline-First Architecture Skill

## Mission
To build an application that treats a network connection as an optional enhancement rather than a strict requirement. The app must launch instantly, display cached data immediately, allow the user to perform actions while offline, and sync gracefully when the connection returns.

---

## Core Principles

1. **Local State is King**
   - The app should always read from the local database/cache first. The network is only used to update the local cache.
2. **Optimistic UI Updates**
   - Assume network requests will succeed. Update the UI instantly when the user takes an action, then synchronize in the background. Roll back the UI only if the network request definitively fails.
3. **Action Queueing (Event Sourcing)**
   - If the user performs a mutating action (e.g., creating a post, liking a photo) while offline, save that action to a local "Mutation Queue".
4. **Transparent Network Status**
   - Inform the user subtly when they are offline or when the app is syncing in the background, but never block them from navigating or reading cached data.

---

## Execution Workflow

### Phase 1: Storage Strategy Selection
Before writing code, define the local storage engine:
- **Simple Key-Value:** Prefer `react-native-mmkv` for synchronous, blazing-fast reads/writes (much faster than `AsyncStorage`).
- **Complex/Relational Data:** Use `WatermelonDB` (highly recommended for offline-first React Native), `Realm`, or `expo-sqlite`.
- **Query Caching:** Use `React Query` (TanStack Query) with its `persistQueryClient` plugin to automatically handle offline cache persistence.

### Phase 2: The "Stale-While-Revalidate" Read Flow
Implement this exact flow for fetching data:
1. Screen loads.
2. Read data from Local Storage -> Render UI immediately.
3. If network is available, fetch fresh data from the API in the background.
4. Update Local Storage with the new data.
5. The UI re-renders automatically because it is subscribed to the Local Storage changes.

### Phase 3: The Optimistic Mutation Flow
Implement this exact flow for user actions (POST/PUT/DELETE):
1. User triggers action.
2. Update Local Storage immediately -> Render updated UI.
3. Attempt the API call.
4. **If Network Fails:** Push the API request details (endpoint, payload, method) to an offline Mutation Queue (persisted in local storage).
5. **Network Returns:** A background listener detects the network (`@react-native-community/netinfo`), reads the Mutation Queue, and processes the requests sequentially.

---

## Expo / React Native Specific Best Practices

- **Network Detection:** Use `expo-network` or `@react-native-community/netinfo` to globally track online/offline status.
- **Handling Images Offline:** Use `expo-image` or `react-native-fast-image` for automatic disk caching of remote images. Do not fetch images via standard `<Image>` tags if they need to be viewed offline.
- **Conflict Resolution:** If a queued offline action is rejected by the server (e.g., someone else deleted the post while you were offline), handle the error gracefully without crashing the app. Inform the user and roll back the optimistic UI update.
- **UUIDs for Local Creation:** When creating new records offline, generate a unique `UUID` (v4) locally. Do not rely on the database to generate incremental integer IDs, otherwise you cannot link related local records before syncing.

---

## Safety & Quality Checks
- [ ] Can the user force-close the app, turn on Airplane Mode, reopen the app, and still view previously loaded data?
- [ ] Do user actions (like adding an item) reflect instantly on the screen without a loading spinner?
- [ ] Are offline actions safely queued and automatically synced when the network connection is restored?
- [ ] Are new records assigned a local UUID so they can be referenced before hitting the backend?
- [ ] Did you properly handle the case where a queued mutation fails on the server?
