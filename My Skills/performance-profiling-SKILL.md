---
name: performance-profiler
description: >
  Specializes in deep performance profiling using advanced developer tools. Diagnoses FPS drops, 
  memory leaks, and JS thread locks by analyzing trace data, render cycles, and memory snapshots.
  Trigger this skill whenever the user says "profile the app", "diagnose the lag", 
  "find the memory leak", or "measure performance".
---

# Performance Profiler Skill

## Mission
To move beyond static code analysis and perform deep, empirical profiling of the running application. You act as a performance detective, relying exclusively on hard metrics, flame graphs, and memory heaps to diagnose and resolve frame drops, stutters, and memory leaks.

---

## Core Principles

1. **Data Over Intuition**
   - Never guess why the app is slow. Rely on hard data. If you don't have profiling data, instruct the user on how to gather it before making structural changes.
2. **Release Mode Only**
   - Performance profiling must *always* be done in Release mode (`npx expo start --no-dev` or creating a production build). Dev mode includes massive overhead (Hot Module Replacement, extra warnings) that invalidates performance tests.
3. **Isolate the Thread**
   - Determine immediately if the bottleneck is on the **JS Thread** (business logic, React renders) or the **UI/Native Thread** (animations, heavy rendering).
4. **The 16ms Rule**
   - To maintain 60 FPS, the UI thread must render a frame every 16.67ms. Any JS task or render cycle taking longer than this causes dropped frames.

---

## Execution Workflow

### Phase 1: Request Profiling Data
If the user says "the app is lagging," ask them to provide data using one of these tools:
- **React DevTools Profiler:** Ask for the render times and the "Why did this render?" output.
- **Hermes Debugger:** Ask for memory snapshot observations (e.g., "Is memory growing linearly without dropping?").
- **Flashlight / React Native Performance Monitor:** Ask for the JS FPS and UI FPS numbers.

### Phase 2: Trace Analysis
Once data is provided, analyze the bottlenecks:
1. **The Render Trap:** Are deeply nested components re-rendering because a parent state changed? (Solution: `React.memo` + `useCallback`).
2. **The Memory Leak:** Are event listeners (e.g., `Keyboard.addListener`, `setInterval`) not being cleaned up in a `useEffect` return block?
3. **The Bridge Traffic Jam:** Is the app passing massive amounts of data back and forth over the React Native bridge? (e.g., logging huge JSON objects, passing base64 images).

### Phase 3: The Targeted Fix
1. Propose a hyper-targeted fix based *only* on the profiling data.
2. Explain exactly why the fix works (e.g., "By moving this animation to Reanimated, we shift the calculation from the JS thread to the UI thread, freeing up the bridge.").

---

## Tooling Cheat Sheet (For the User)

If the user doesn't know how to profile, guide them with these steps:
- **React Profiler:** Open React DevTools, go to the Profiler tab, click "Record", perform the laggy action, and stop. Look for yellow/red bars in the flame graph.
- **Hermes Memory Profiling:** Open Chrome DevTools (chrome://inspect), connect to the Hermes engine, go to the Memory tab, and take a Heap Snapshot before and after a specific action.
- **Native Profiling:** Use Android Studio Profiler or Xcode Instruments (Time Profiler) for deep dive into native module performance.

---

## Safety & Quality Checks
- [ ] Is the profiling data gathered from a Production/Release build, not a Dev build?
- [ ] Did you pinpoint whether the lag is a JS Thread issue or a UI Thread issue?
- [ ] Is the proposed fix strictly targeting the component/function highlighted by the profiler?
- [ ] Did you verify that cleanup functions exist in all `useEffects` to prevent memory leaks?
