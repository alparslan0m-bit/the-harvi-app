# Navigation Patterns: Glassmorphic Tabs & Safe-Area Paddings

This document defines the routing conventions, visual tab bar configurations, and dynamic safe-area padding calculations of the Harvi application.

---

## 1. The Glassmorphic Frosted Bottom Tab Bar

Harvi achieves a highly premium iOS visual effect by rendering a **Glassmorphic Bottom Tab Bar** on iOS. Instead of static solid cards, the tab background utilizes a frosted `BlurView` combined with a thin ambient top rim-light:

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {isIOS ? (
              <BlurView
                intensity={85}
                tint={colors.theme === "dark" ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
            )}
            
            {/* Ambient Rim-Light Border */}
            <View style={{
              height: 1.5,
              backgroundColor: colors.theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.03)",
              width: "100%",
              position: "absolute",
              top: 0,
            }} />
          </View>
        ),
      }}
    >
      <Tabs.Screen name="(learn)" options={{ title: "Learn" }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
```

---

## 2. Dynamic Bezel Safe-Area Paddings

To support bezel-less mobile screens (like iPhone X series, dynamic islands, or Android edge-to-edge layouts) without content clipping or overlapping bottom controls, padding offsets are calculated dynamically:

```typescript
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ScreenContainer({ children }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        // Ensures padding handles standard notches at the top and home indicator bars at the bottom
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {children}
    </View>
  );
}
```

---

## 3. Dynamic SF Symbols vs. Vector Icons

To align with modern iOS system guidelines, the navigation bar integrates native Apple SF Symbols when rendering on iOS devices, falling back to standard Feather vector icons on Android or Web:

```typescript
// components/TabIcon.tsx
import React from "react";
import { Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

// expo-symbols is the standard package for SF Symbols
import * as Symbols from "expo-symbols"; 

export function TabIcon({ 
  name, 
  sfName, 
  color, 
  size = 24 
}: { 
  name: keyof typeof Feather.glyphMap; 
  sfName: string; 
  color: string; 
  size?: number; 
}) {
  if (Platform.OS === "ios" && sfName) {
    // Renders native Apple SF Symbols
    return <Symbols.SymbolView name={sfName} size={size} tintColor={color} />;
  }

  // Renders vector icons on Android/Web
  return <Feather name={name} size={size} color={color} />;
}
```
---

## 4. Navigation Rules

1.  **Always use `router.replace` for Auth gates**: When redirecting a user after successful signup or logout, use `router.replace` instead of `router.push`. This clears the transition history stacks, preventing users from accidentally clicking the hardware back button to return to signed-out states.
2.  **Explicit Absolute Tabs**: Ensure the bottom tab bar stylesheet sets `position: "absolute"`. Without this parameter, screen grids will render on top of the tab bar instead of behind it, preventing the glassmorphic background blur from resolving.
3.  **Maximum Bezel Padding**: When setting a custom bottom tab bar height, use a safe margin that integrates the user's bezel notch:
    ```typescript
    height: 55 + Math.max(insets.bottom - 6, 4)
    ```
