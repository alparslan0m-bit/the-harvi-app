# Animation & Spring Physics Design System: 120 FPS premium Motion

This document outlines the animation standards, spring physics configurations, and motion transitions of the App Factory workspace. It explains how to build smooth, non-blocking UI states using React Native Reanimated v4 and native driver interpolations.

---

## 1. Spring Physics Mechanics (Simulating Physical Weight)

Harvi avoids rigid, linear web transitions. Instead, progress bars, card selections, and bottom sheets utilize **spring physics** equations to simulate mass, inertia, and elastic friction.

### Physics Tuning Parameters
*   **Mass (Inertia)**: Higher mass makes the component feel heavier and slow to accelerate but harder to stop. Keep between `0.8` and `1.2`.
*   **Stiffness (Tension)**: Controls the speed and snap of the animation. High values pull the component fast. Default ranges: `100` to `200`.
*   **Damping (Friction)**: Dampens the spring bounce. High values stop the spring fast (preventing oscillation); low values cause prolonged bouncing. Default ranges: `12` to `18`.

### Spring Progress Implementation
```tsx
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from "react-native-reanimated";

export function SpringProgressBar({ progress }: { progress: number }) {
  const widthShared = useSharedValue(0);

  useEffect(() => {
    widthShared.value = withSpring(progress, {
      damping: 15,     // Bouncing dampener
      stiffness: 120,   // Movement velocity
      mass: 1.0        // Structural inertia weight
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthShared.value * 100}%`,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, width: "100%", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, backgroundColor: "#0ea5e9" },
});
```

---

## 2. Dynamic Count-Up Score & Scale Entrances

When a user completes a quiz, numbers are not displayed instantly. We trigger a synchronized count-up counter along with high-fidelity spring entrances to release micro-dopamine hits:

```typescript
// hooks/useQuizResultsAnimation.ts
import { useEffect, useState } from "react";
import { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming 
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export function useQuizResultsAnimation(score: number) {
  const [displayScore, setDisplayScore] = useState(0);

  // 1. Score count-up interval
  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.ceil(score / 35));
    const timer = setInterval(() => {
      current = Math.min(current + step, score);
      setDisplayScore(current);

      // Light haptic ticks during fast count-ups
      if (current % 3 === 0) Haptics.selectionAsync().catch(() => {});

      if (current >= score) {
        clearInterval(timer);
        // Double success buzz on absolute completion
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, 18);
    return () => clearInterval(timer);
  }, [score]);

  // 2. Entrance scale & opacity
  const ringScale = useSharedValue(0.55);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    ringScale.value = withSpring(1, { damping: 16, stiffness: 160 });
    ringOpacity.value = withTiming(1, { duration: 450 });
  }, []);

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return { displayScore, ringAnimStyle };
}
```

---

## 3. Overriding System Reduced Motion Settings

Modern mobile operating systems include a system-level "Reduce Motion" setting. If enabled, the system drops all custom UI animations, causing custom transitions to freeze or break.

To guarantee high-fidelity presentation loops, Harvi explicitly overrides this by mounting a `ReducedMotionConfig` at the root, forcing springs to render regardless of global OS overrides:

```tsx
// app/_layout.tsx
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";

export default function RootLayout() {
  return (
    <>
      {/* Ensures custom animations and screen slides are never skipped */}
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      {/* rest of your layout */}
    </>
  );
}
```

---

## 4. AI UI Heuristics & Selection Logic

Future AI visual engineers must follow this guidelines loop when styling active layouts:

```
                  ┌──────────────────────────────┐
                  │    Define Transition Types   │
                  └──────────────┬───────────────┘
                                 │
                  Is the transition a pure spatial translate?
                  ├── Yes ──► Enforce spring physics (withSpring)
                  │
                  └── No  ──► Is it an opacity fade or color shifts?
                              ├── Yes ──► Use simple Timing interpolation (withTiming)
                              └── No  ──► Use Native driver animated utilities
```

---

# Anti-Patterns

*   **Layout Reflow Mutations (`width` / `height` animations)**: Animating spacing properties like `width`, `height`, `padding`, or `margin` dynamically inside a loop.
    *   *Consequence*: Forces the native React Native layout engine to recalculate full screen positions on *every frame*, dropping refresh speeds from 120 FPS to under 25 FPS. Always use `transform: [{ scale }]` or `translateX/translateY`.
*   **State Synchronizations inside Animation Loops**: Updating a React component state (via `useState`) inside an active, high-frequency Reanimated scroll listener.
    *   *Consequence*: Triggers full JS thread rerenders 60 to 120 times a second, completely freezing the app and causing heavy visual frame stutters.
*   **Unthrottled Gesture listeners**: Running complex trigonometry computations on gesture events without limits or worklet threading.
    *   *Consequence*: Saturates the serialized React Native bridge, causing touch lag and delaying visual feedback by up to 2 seconds.
