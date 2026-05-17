# Performance Quality Score: Frame Rate Formulas & Cell Recycling Checkers

This document defines the mathematical scoring matrices, hardware frame rate benchmarks, and cell recycling checklists used to audit runtime layout performance inside the App Factory OS.

---

## 1. Performance Quality Formula

Prior to release packaging, the AI agent must compute the **Performance Quality Score (PQS)**:

$$\text{PQS} = 100 - (\text{Frame Drops} \times 5) - (\text{Unmemoized Lists} \times 20) - (\text{Dynamic Layout Shifts} \times 15)$$

*   **PQS >= 95**: Approved. System meets high-speed native requirements.
*   **PQS < 95**: Blocked. Layout loops must undergo performance refactoring.

---

## 2. Dynamic Performance Grid

The review agent must measure and record the following metrics during active device simulation runs:

| Performance Check | Target Standard | Penalty Value | Corrective Action |
| :--- | :--- | :--- | :--- |
| **Active Scroll Rate** | Constant 120 FPS (60 FPS minimum on legacy platforms). | -5 per dropped frame | memoize visual list cells. Add absolute sizes. |
| **Cell Recycling** | Lists utilize `getItemLayout` for static size calculations. | -20 if missing | Enforce static cell sizes. Declare layout specs. |
| **CPU Worklet Offloads** | Animations route through Reanimated UI worklet threads. | -15 if on JS thread | Move state animations to useSharedValue. |
| **Bridge Traffic** | API payloads are batched and clean. | -10 per redundant hit | Implement query caching and NetInfo pre-flights. |

---

## 3. High-Performance Benchmarks

*   **Query Latency**: Remote API fetches must execute in under 250ms; cached queries must resolve instantly in under 15ms.
*   **Image Caching**: All remote images must declare `cachePolicy="disk"` inside `expo-image` wrappers to avoid repeated downloads.

---

# Anti-Patterns to Avoid

*   **Unthrottled Scroll Handlers**: Running complex calculations inside active list scroll events without throttling rules.
    *   *Consequence*: Starves the JS thread, drops frame rates under 20 FPS, and crashes Dev servers.
*   **Uncached Remote Assets**: Downloading profile photos or course guides on every mount cycle without local AsyncStorage cache maps.
    *   *Consequence*: increases cellular data usage for users, slows UI rendering, and increases database server load.
