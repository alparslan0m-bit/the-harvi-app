---
name: performance-auditor
description: >
  Audits the codebase for performance bottlenecks and creates a strategic plan to enhance 
  speed, memory usage, and rendering efficiency using industry best practices.
  Trigger this skill whenever the user says "audit performance", "make the app faster", 
  "fix lag", "stop the stuttering", or "optimize the code".
---

# Performance Auditor Skill

## Mission
To meticulously audit the application for performance bottlenecks (rendering, network, memory, and computational) and formulate a precise, impactful enhancement plan *before* making any changes. Optimization without measurement is just guessing.

---

## Core Principles

1. **Measure First, Optimize Second**
   - Never optimize blindly. Identify the actual bottleneck (e.g., is it a slow API, a massive re-render, or a memory leak?).
2. **The 80/20 Rule**
   - Focus on the 20% of the code causing 80% of the performance drop. Usually, this is lists, heavy animations, or top-level state changes.
3. **The UI Thread is Sacred**
   - Never block the main thread. Offload heavy lifting, complex parsing, or large array manipulations so the UI remains fluid (60fps).
4. **Network and State Efficiency**
   - Don't over-fetch data, don't trigger unnecessary re-renders, and don't hold onto memory you no longer need.

---

## Execution Workflow

### Phase 1: The Audit (Information Gathering)
Scan the provided code specifically looking for the following culprits:
1. **Render Bottlenecks:** Deep component trees, inline functions/objects passed as props to heavy children, missing `React.memo`.
2. **State/Data Bottlenecks:** Massive JSON payloads parsed on the UI thread, global state changes that trigger app-wide re-renders, $O(N^2)$ loops inside render methods.
3. **Asset Bottlenecks:** Unoptimized, massive images loaded directly into memory without resizing or caching.
4. **List Bottlenecks:** Using `.map()` for long lists instead of a virtualized list.

### Phase 2: The Enhancement Plan
Before modifying the code, present the user with a structured **Performance Enhancement Plan**. It should include:
- The identified bottlenecks.
- The proposed solution for each (e.g., "Implement `React.memo` on the Card component", "Switch from `.map()` to `FlatList`").
- Wait for the user's approval before proceeding.

### Phase 3: Surgical Execution
1. Implement the optimizations one at a time.
2. Verify that the UI behaves exactly as before, just faster.

---

## React Native / Expo Specific Best Practices

- **Lists:** Always use `FlatList` or `FlashList` for anything over 20 items. Crucial props: `keyExtractor`, `getItemLayout` (if fixed height), `initialNumToRender`, and `windowSize`.
- **Images:** Use `expo-image` or `react-native-fast-image` instead of the standard `<Image>` component for caching and better memory management. Serve WebP or optimally sized images.
- **Animations:** Use `react-native-reanimated` to ensure animations run on the UI thread, entirely bypassing the JavaScript bridge.
- **Memoization:** Use `useCallback` and `useMemo` strictly when passing functions/objects down to heavy child components that are wrapped in `React.memo`. (Overusing memoization when not needed actually *hurts* performance).
- **Bundle Size:** Audit imports. Don't import an entire massive library (like `lodash`) if you only need one utility function (e.g., `lodash/debounce`).

---

## Safety & Quality Checks
- [ ] Was the root cause of the lag correctly identified before changes were made?
- [ ] Are we sure we didn't just add `useMemo` everywhere blindly?
- [ ] Has the optimization preserved 100% of the original functionality?
- [ ] Is the app achieving a smooth 60fps during interactions?
- [ ] Did you present a plan and get user approval before executing massive refactors?
