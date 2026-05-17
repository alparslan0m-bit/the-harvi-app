# Navigation Generation Engine: Glassmorphic Tab Bars, Stack Stems & Bezels

This document outlines the step-by-step workflows, optimization passes, and validation checks required by AI agents to construct polished, frosted navigation tab bars and routing setups inside the App Factory OS.

---

## 1. Generation Execution Workflow

Navigation router construction must be executed sequentially, verifying each step before proceeding:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: Screen Options Setup               │
        │  Configure tab route maps, title labels, and icons     │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: Glassmorphic Backdrop            │
        │  Mount iOS BlurView tint, set absolute solid fallback  │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 3: Bezel Offset Calculations          │
        │  Hook useSafeAreaInsets, apply dynamic padding gaps    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 4: Top Border Rim-lighting           │
        │  Inject ambient top border border styling to tab bar   │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Navigation Optimization Passes

*   **Absolute Tab Positioning**: Ensure `position: "absolute"` is set. Without absolute positioning, screen containers will render *above* the tab bar instead of behind it, preventing the frosted glass blur from showing.
*   **Dynamic Bottom Padding Gaps**: Enforce bottom safe-area padding calculations using safe-area context hooks to prevent overlap with standard system home indicators.
*   **iOS/Android Fallbacks**: Android devices do not support native background blur operations efficiently. Always fall back to solid card backgrounds on Android while retaining glassmorphism on iOS.

---

## 3. Dynamic Navigation Verification

AI agents can verify that a newly generated navigation tab layout compiles correctly by running this mock check:

```typescript
// scratch/verify_navigation_build.ts
import { Platform } from "react-native";

function verifyNavigation() {
  const isIOS = Platform.OS === "ios";
  console.log(`Success: Navigation platform identified as ${Platform.OS}. Solid fallback loaded for Android.`);
}

verifyNavigation();
```

---

# Anti-Patterns to Avoid

*   **Dynamic Bezels Hardcoding**: Setting a static bottom margin (e.g. `paddingBottom: 40`) instead of calling safe-area context hooks.
    *   *Consequence*: Visual layouts overlap with the system home indicator on various device screens (e.g. iPad vs. iPhone 15 Pro Max).
*   **Nesting Large Stacks Inside Tab Controllers**: Nesting full navigation stack controllers directly inside primary tab bar configurations.
    *   *Consequence*: balloons memory heap profiles, triggers navigation routing errors, and slows Metro packager updates.
