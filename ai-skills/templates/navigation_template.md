# Navigation Template: Scaffolding Blueprint for Glassmorphic Tabs

This template provides the standard file-based routing layout, frosted glassmorphic bottom tab bar, ambient rim-lighting top border, and safe-area bezel offset configurations required to build a polished navigation shell in the App Factory workspace.

---

## 📂 Proposed File Path

Navigation routers and tab layouts must be declared inside the `app/(tabs)/` directory. For example:

```
c:\Users\METRO\harvi gamed\
└── app/
    └── (tabs)/
        └── _layout.tsx          # Centralized Tab Router Configs
```

---

## 💻 Code Scaffolding

```tsx
// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";

  // Calculate dynamic bottom padding to clear notched bezels
  const tabHeight = 56 + Math.max(insets.bottom - 6, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: styles.labelStyle,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabHeight,
            backgroundColor: isIOS ? "transparent" : colors.card,
            paddingBottom: insets.bottom + 4,
          },
        ],
        // ── 1. FROSTED GLASSMORPHIC BACKGROUND ──
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
            
            {/* ── 2. AMBIENT RIM-LIGHT TOP BORDER ── */}
            <View
              style={[
                styles.rimLight,
                {
                  backgroundColor: colors.theme === "dark" 
                    ? "rgba(255, 255, 255, 0.08)" 
                    : "rgba(0, 0, 0, 0.03)",
                },
              ]}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, size }) => <Feather name="trending-up" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: 0,
    elevation: 0,
  },
  labelStyle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  rimLight: {
    height: 1.5,
    width: "100%",
    position: "absolute",
    top: 0,
  },
});
```

---

## ⚙️ Generation Rules & Best Practices

1.  **Enforce Absolute Tab Positioning**: Ensure `position: "absolute"` is set. Without absolute positioning, screen containers will render *above* the tab bar instead of behind it, preventing the frosted glass blur from showing.
2.  **Explicit Bezel clearing bottom offsets**: Dynamic bottom safe-area values vary across screen notches. Enforce `paddingBottom` calculations using safe-area context hooks to prevent overlap with standard system home indicators.
3.  **Include Android/Web Solid Fallbacks**: Android devices do not support native background blur operations efficiently. Always fall back to solid card backgrounds on Android while retaining glassmorphism on iOS.

---

## 📈 Scalability Notes

*   **Avoid Tab Bar Nesting**: Complex stack components must be registered inside parent Stack Routers, not directly inside tabs. This keeps navigation stacks flat, prevents memory inflation, and maintains predictable deep link routing.
*   **Redirect Gatekeepers**: Use `router.replace` rather than `router.push` when sending users between authenticated stack zones to prevent them from hitting system back buttons to return to unauthorized regions.
