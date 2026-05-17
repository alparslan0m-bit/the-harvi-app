# Loading States: Skeletons & Screen Buffers

This document defines the standards for visual loading indicators, skeleton loading structures, and loading screen transitions inside the Harvi workspace.

---

## 1. Skeleton Loading Philosophy

Harvi avoids raw, full-screen loaders (spinners) for regular database content. Spinning loaders focus the user's attention on the wait duration. Instead, Harvi uses **Skeleton Loaders** (Visual Bones) that mock the shape of content about to load, shifting focus to the incoming data layout.

```
       ┌────────────────────────┐
       │   Card skeleton bone   │
       │  ┌───┐                 │
       │  │ O │  ███████████    │
       │  └───┘  ████████       │
       │                        │
       └────────────────────────┘
```

### Implementing a Base Bone Loader
```typescript
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming 
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

export function SkeletonBone({ width, height, radius = 8 }: { width: any; height: number; radius?: number }) {
  const colors = useColors();
  const opacityVal = useSharedValue(0.3);

  useEffect(() => {
    // Pulse animation
    opacityVal.value = withRepeat(
      withTiming(0.7, { duration: 650 }),
      -1, // Infinite loops
      true // Reverse direction on end
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacityVal.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bone,
        animStyle,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.muted,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bone: {
    overflow: "hidden",
  },
});
```

---

## 2. Quiz Screen Loaders

For heavy initializations (like preparing questions or setting up the secure XOR-decryption keys), the application serves focused loading screens that prevent partial UI mounts:

```typescript
// components/quiz/QuizLoadingScreen.tsx
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function QuizLoadingScreen() {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>Assembling Quiz</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Loading and securing questions...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { alignItems: "center", gap: 12 },
  title: { fontSize: 22, fontFamily: "Nunito_800ExtraBold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" }
});
```

---

## 3. UI Transition Principles

1.  **Avoid Loader Flickering**: If a query resolves in under **100 milliseconds**, do not show a loading state at all (handled via TanStack Query's memory caching and `initialData` setup). Rushing a loader on screen for 50ms only to instantly replace it feels jarring.
2.  **Explicit heights**: Skeletons must carry explicit width and height matching the final item structure to prevent lay-out shifts upon database resolution.
