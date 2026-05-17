# Screen Template: Scaffolding Blueprint for Route Views

This template provides the standard structural layout, safe-area boundary configurations, and entering transitions required to build high-performance, polished screen routes in the App Factory workspace.

---

## 📂 Proposed File Path

Screen files must be placed directly inside the `app/` routing directory. For example:

```
c:\Users\METRO\harvi gamed\
└── app/
    └── (tabs)/
        └── stats.tsx            # Active screen view route
```

---

## 💻 Code Scaffolding

```tsx
// app/(tabs)/stats.tsx
import React, { useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useScreenAnimation } from "@/hooks/useScreenAnimation";

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // ── 1. SCREEN ENTRANCE ANIMATION ──
  const { fadeAnim, translateY } = useScreenAnimation(scrollRef);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
            // ── 2. DYNAMIC notch/BEZEL SAFE-AREAS ──
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
          {/* ── 3. SCREEN HEADER TITLE ── */}
          <Text style={[styles.header, { color: colors.foreground }]}>Performance Metrics</Text>
          <Text style={[styles.subheader, { color: colors.mutedForeground }]}>
            Monitor your subject progress and quiz parameters.
          </Text>

          {/* ── 4. DYNAMIC SCREEN CONTENT GOES HERE ── */}
          <View style={styles.contentPlaceholder}>
            <Text style={{ color: colors.foreground }}>Content widgets...</Text>
          </View>
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
  subheader: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  contentPlaceholder: { height: 300, borderStyle: "dashed", borderWidth: 1.5, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 8 },
});
```

---

## ⚙️ Generation Rules & Best Practices

1.  **Always use standard `useScreenAnimation`**: Direct mounts look unpolished. The hook handles smooth entering slides and scrolling the viewport back to the top when navigating back to the active tab.
2.  **Explicit Scroll Ref mapping**: Ensure the `ref={scrollRef}` property is mapped directly to the `<ScrollView>` container to enable automated scroll resets.
3.  **Strict Safe-Area calculation**: Never hardcode screen margins or paddings at the top/bottom. Rely strictly on `useSafeAreaInsets` to support notched screens and system home indicators seamlessly.

---

## 📈 Scalability Notes

*   **Flat Rendering Hierarchy**: Keep screen containers flat. The main view should only act as a coordinator that maps layouts, imports custom hooks, and mounts highly memoized sub-widgets.
*   **Lazy Load Widgets**: If the page includes expensive components (like complex charts or settings panels), lazy load them using React Suspense to optimize initial screen mounting speeds.
