# Debugging Workflow: Networks, Cache & Emulators

This document defines standard procedures for debugging network traffic, caching states, sync queues, and database configurations within the Harvi workspace.

---

## 1. Tracing Network & API Requests

To debug Supabase queries, Edge Function responses, and external Stripe payment redirections, engineers must trace outgoing and incoming network calls.

### Key Workflows
*   **React Native Debugger / Chrome DevTools**: Launch the Expo developer menu inside the emulator by pressing `d` in the terminal or `Cmd + D` (iOS) / `Ctrl + M` (Android) on the device. Select **Debug JS Remotely** to trace consoles and profile performance inside Chrome.
*   **Network Tab Enforcements**: To trace dynamic HTTP requests inside Chrome DevTools, network inspection must be enabled:
    ```typescript
    // Add to app/_layout.tsx inside a __DEV__ condition block to debug requests
    if (__DEV__) {
      global.XMLHttpRequest = global.originalXMLHttpRequest 
        ? global.originalXMLHttpRequest 
        : global.XMLHttpRequest;
    }
    ```

---

## 2. Debugging Offline Sync Engines

To audit the offline synchronization queue (`offlineQueue.ts`) and poison-pill flushing workflows:

1.  **Force Offline State**: Inside the simulator, toggle airplane mode or disconnect internet configurations on the host machine.
2.  **Verify AsyncStorage Queues**: Run standard quiz actions and trace active insertions to `harvi:quiz_queue` inside console monitors:
    ```typescript
    const rawQueue = await AsyncStorage.getItem("harvi:quiz_queue");
    console.log("Active Pending Queue:", JSON.parse(rawQueue));
    ```
3.  **Restore Network**: Enable connectivity on the emulator. Watch standard sync drainage routines:
    *   Ensure queue entries flush sequentially.
    *   Verify that TanStack React Query invalidates stats and progress caches, updating page UI instantly.

---

## 3. Emulators & Developer Best Practices

1.  **Erase Simulator Storage Regularly**: Test first-time app launches by resetting storage settings on the emulator. On iOS, select **Device > Erase All Content and Settings**; on Android, select **Wipe Data** inside the AVD Manager.
2.  **Inspect SQLite & local databases**: Use visual tools like **react-native-flipper** or Android Studio Database Inspectors to parse persistent files and caches on emulated devices.
