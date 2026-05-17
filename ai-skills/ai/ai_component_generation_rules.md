# AI Component Generation Rules: Props & Dynamic Styles

These rules instruct future AI agents on how to construct, style, and interface reusable subcomponents in the Harvi workspace.

---

## 1. Component Structure standards

Every generated component must be placed in `components/` and adhere to this structure:

```tsx
// components/ui/CardExample.tsx
import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

// ── 1. EXPLICIT INTERFACE CONTRACT ──
export interface CardExampleProps {
  title: string;
  description: string;
  isActive?: boolean;
}

// ── 2. MEMOIZATION FOR RENDER TUNING ──
export const CardExample = memo(function CardExample({
  title,
  description,
  isActive = false,
}: CardExampleProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          // ── 3. SEMANTIC COLOR MAPS ──
          backgroundColor: isActive ? colors.primary + "1A" : colors.card,
          borderColor: isActive ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.desc, { color: colors.mutedForeground }]}>
        {description}
      </Text>
    </View>
  );
});

// ── 4. STATIC STYLESHEET AT BOTTOM ──
const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  desc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
```

---

## 2. Component Generation Rules

1.  **Strict Props Definitions**: All properties passed to components must be explicitly declared inside clean interface typings. Never use loose configurations or allow untyped parameter injection.
2.  **Styles Isolation**: Stylesheets must reside at the bottom of the component file. Dynamic overrides should be placed inline and combined with static rules: `style={[styles.base, { dynamicStyle }]}`.
3.  **Memoize Repeatable Cards**: Wrap components that populate lists inside `memo` to prevent redundant render evaluations during parent state updates.
