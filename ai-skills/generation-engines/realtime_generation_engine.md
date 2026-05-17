# Realtime Generation Engine: WebSocket Channels, Presence & Sync Events

This document defines the automated stages, WebSocket channel configs, and user presence tracking rules required by AI agents to construct secure, high-speed realtime data channels inside the App Factory OS.

---

## 1. Realtime Generation Workflow

Every generated realtime channel subscription must implement the following sequential structures:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: WebSocket Channel Init             │
        │  Initialize Supabase realtime socket channel reference │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: Schema Event Bindings             │
        │  Bind to specific database events (INSERT, UPDATE)     │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 3: Presence & State Sync             │
        │  Track online presence maps, serialize state updates   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 4: Lifecycle Unsubscribe             │
        │  Prune channel on unmount, cleaning active connections  │
        └────────────────────────────────────────────────────────┘
```

---

## 2. High-Speed Synchronization Rules

*   **Rule 1 (Targeted Filters)**: Never listen to complete tables without constraints. Always specify row filters (e.g. `filter=user_id=eq.user-id`) to restrict socket traffic to the active user session.
*   **Rule 2 (Dynamic Reconnections)**: Implement progressive backoff reconnection loops to recover socket connections cleanly when network dropouts occur.
*   **Rule 3 (Lifecycle Cleanup)**: Realtime hooks must return explicit cleanup functions in useEffect hooks to prune socket channels, avoiding connection resource leaks.

---

## 3. Dynamic Realtime Verification

AI agents can verify that a newly generated realtime channel compiles correctly by running this mock check:

```typescript
// scratch/verify_realtime_build.ts
import { supabase } from "@/lib/supabase";

function testRealtimeChannel() {
  try {
    const channel = supabase.channel("room-1")
      .on("presence", { event: "sync" }, () => {
        console.log("Success: Realtime presence sync event compiled cleanly.");
      })
      .subscribe();
      
    channel.unsubscribe();
  } catch (err) {
    console.error("Failure: Realtime channel setup failed:", err);
  }
}

testRealtimeChannel();
```

---

# Anti-Patterns to Avoid

*   **Global Unfiltered Broadcasts**: Listening to raw tables globally (e.g. `from("*")`) without user ID filters.
    *   *Consequence*: balloons network packet sizes, slows client rendering, and increases database server memory usage.
*   **Neglecting Socket Cleanups**: Leaving active WebSocket channels open when a component unmounts.
    *   *Consequence*: triggers socket leaks, blocks memory threads, and crashes device network sockets.
