# Rendering Optimization: 120 FPS Native Mobile Layouts

This document details the render engine optimizations, list memory recycling, and JavaScript bridge tuning protocols of the App Factory mobile client.

---

## 1. Advanced list Recycling (Zero Scroll Lag)

Standard React Native `<ScrollView>` compiles all elements instantly, leading to memory exhaustion and UI lockups on large feeds. While `<FlatList>` recycles views, it requires exact layout configurations to run at 120 FPS without blank screen boxes:

### Optimized FlatList Blueprint
```tsx
import React, { useCallback } from "react";
import { FlatList, StyleSheet } from "react-native";
import { SubjectCard } from "@/components";
import { useColors } from "@/hooks/useColors";

const CARD_HEIGHT = 140; // Static pixel height including margins

export function OptimizedSubjectList({ items }: { items: any[] }) {
  const colors = useColors();

  // 1. Memoized render callback (Prevents redeclaration on parent updates)
  const renderItem = useCallback(({ item }: { item: any }) => (
    <SubjectCard item={item} />
  ), []);

  // 2. Persistent unique key (Prevents duplicate structural reconciliation)
  const keyExtractor = useCallback((item: any) => item.id, []);

  // 3. Static item layout calculation (Bypasses dynamic height measurements)
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  }), []);

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      
      // ── ADVANCED PERFORMANCE TUNING ──
      initialNumToRender={6}          // Only render items fitting the viewport on boot
      maxToRenderPerBatch={10}        // Restrict rendering pipeline size per frame
      windowSize={5}                  // Keep only 2 viewports worth of off-screen cards
      removeClippedSubviews={true}    // Unmount off-screen native rendering layers
      updateCellsBatchingPeriod={50} // Wait 50ms between batched renders
    />
  );
}
```

---

## 2. Preventing JS Bridge Congestion

In React Native, the JS thread communicates with the Native UI thread via a serialized bridge. Sending rapid messages (like raw touch tracking or high-frequency style edits) over this bridge will saturate it, causing inputs to drop or lag.

### Bridge Optimization Protocols
1.  **Run calculations in Reanimated context**: Always perform animations or layout calculations inside Reanimated's UI thread using `useSharedValue` and `useAnimatedStyle`. This executes transitions directly on the native rendering layer without serializing data back and forth to JS:
    ```typescript
    // CORRECT: Runs completely on Native UI thread
    const animStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: xSharedVal.value }],
    }));
    ```
2.  **Debounce Search Inputs**: Never trigger heavy database queries or layout reflows on every keystroke:
    ```typescript
    const debouncedQuery = useDebounce(rawInput, 300);
    ```

---

## 3. Lazy Loading Large Feature Blocks

To keep the initial bundle lightweight and boot speeds under **800 milliseconds**, heavy components (such as Stripe checkouts, dynamic settings panels, or charts) should be lazy-loaded using React Suspense:

```tsx
import React, { Suspense, lazy } from "react";
import { ActivityIndicator, View } from "react-native";

// Dynamic import splitting
const AnalyticsChart = lazy(() => import("@/components/profile/AnalyticsChart"));

export function ProfilePanel() {
  return (
    <View style={{ flex: 1 }}>
      <Suspense fallback={<ActivityIndicator size="small" />}>
        <AnalyticsChart />
      </Suspense>
    </View>
  );
}
```

---

## 4. AI Optimization Heuristics

Future AI engines must follow this selection structure when compiling rendering trees:

```
                  ┌──────────────────────────────┐
                  │    Select Screen Scaffolds   │
                  └──────────────┬───────────────┘
                                 │
                  Will the list exceed 20 elements?
                  ├── Yes ──► Enforce FlatList with static getItemLayout
                  │
                  └── No  ──► Does it contain heavy, dynamic subcomponents?
                              ├── Yes ──► ScrollView with lazy-loaded Suspense
                              └── No  ──► Flat static ScrollView container
```

---

# Anti-Patterns

*   **Dynamic Arrow Functions in List Renders (`renderItem={() => <Card />}`)**: Never pass anonymous inline arrow functions inside lists. This creates a new function instantiation on *every* parent render pass, breaking child memoizations.
    *   *Consequence*: Infinite render loops, list scrolling stutters, and visual layout drop-frames.
*   **Variable Height lists without `getItemLayout`**: Leaving FlatList height auto-calculated by native layouts when lists contain hundreds of uniform cards.
    *   *Consequence*: The system continually measures layout bounds dynamically during scrolling, causing visible flashing empty boxes (unrendered cells) during quick scrolls.
*   **Inline heavy calculations inside renders**: Parsing list order, doing string manipulations, or running date formatting loops directly inside component returns.
    *   *Consequence*: JS thread runs out of processing space, dropping frame rates from 120 FPS to under 30 FPS.
