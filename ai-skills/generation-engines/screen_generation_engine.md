# Screen Generation Engine: Layout Skeletons, Safe-Areas & Entry Animations

This document outlines the step-by-step workflows, optimization passes, and validation checks required by AI agents to construct presentation screen routes inside the App Factory workspace.

---

## 1. Generation Execution Workflow

Screen generation must be executed sequentially, verifying each step before proceeding to the next:

```
        ┌────────────────────────────────────────────────────────┐
        │               Stage 1: Input Ingestion                 │
        │  Parse route settings, Subject ID, title parameters    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: Safe-Area Bezel Offsets           │
        │  Hook useSafeAreaInsets, compute dynamic bottom gap    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 3: Entry Animations Mount            │
        │  Inject Reanimated spring values, define coordinates   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │              Stage 4: List Recycler Setup              │
        │  Declare absolute sizes for FlatList cards, memoize    │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Screen Optimization Pass Check

Prior to completing generation, the AI agent must run the **Visual Optimization Pass**:

*   **Pass 1 (Dimension Checks)**: Ensure all images and cards declare absolute width/height sizes to prevent dynamic layout shifts (CLS).
*   **Pass 2 (Scroll Throttle)**: Set `scrollEventThrottle={16}` on active lists to match native refresh rates.
*   **Pass 3 (Reduced Motion Config)**: Verify that the parent route mounts the Reanimated reduced motion config override.

---

## 3. Dynamic Screen Verification Script

AI agents can verify that a newly generated screen builds correctly by running this script in a scratch environment:

```typescript
// scratch/verify_screen_build.ts
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function MockScreenVerification() {
  try {
    const insets = useSafeAreaInsets();
    if (!insets) throw new Error("SafeArea context is missing!");
    console.log("Success: Screen generation verification passed. Safe-areas resolve cleanly.");
  } catch (err) {
    console.error("Failure: Screen generation verification failed:", err);
  }
}
```

---

# Anti-Patterns to Avoid

*   **Dynamic Bezels Hardcoding**: Setting a static bottom margin (e.g. `paddingBottom: 40`) instead of calling safe-area context hooks.
    *   *Consequence*: Visual layouts overlap with the system home indicator on various device screens (e.g. iPad vs. iPhone 15 Pro Max).
*   **ScrollView Nested Lists**: Nesting a vertical FlatList inside a parent vertical ScrollView component.
    *   *Consequence*: Triggers severe rendering stutters and layout calculation loops, crashing the app.
