# AI Screen Generation Rules: Routes & Layout Wrappers

These rules define standard layout wraps, safe-area structures, and mount transitions that future AI agents must implement when generating new application screens.

---

## 1. Standard Screen Wrapping Blueprint

All screen files placed in `app/` must implement standard safe-area padding calculations and include standard mount animations:

```tsx
import React, { useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useScreenAnimation } from "@/hooks/useScreenAnimation";

export default function NewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Mount animation fades and slides screen up upon focus
  const { fadeAnim, translateY } = useScreenAnimation(scrollRef);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
            // Computes correct top notch offset on iOS/Android
            paddingTop: insets.top + 16, 
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.header, { color: colors.foreground }]}>
            New Screen Title
          </Text>
          
          {/* Screen Body Content */}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, width: "100%" },
  scrollContent: { paddingHorizontal: 24, gap: 16 },
  header: { fontSize: 28, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },
});
```

---

## 2. Screen Generation Rules

1.  **Strict Safe-Area Padding**: Never hardcode top or bottom margins on main containers. Always parse offsets dynamically using `useSafeAreaInsets` to ensure seamless presentation across diverse notched or bezel-less devices.
2.  **Slide-In Entrance**: Every screen route page must trigger standard fade-and-slide transitions via `useScreenAnimation`. Screen transitions that blink on without interpolation feel unpolished.
3.  **Automatic Scroll to Top**: Pass a scroll reference `scrollRef` to `useScreenAnimation`. The hook automatically handles scrolling back to top upon mounting, keeping the viewport aligned for users returning to the tab.
