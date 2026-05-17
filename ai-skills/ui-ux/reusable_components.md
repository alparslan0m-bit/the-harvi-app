# Reusable UI Components & Haptic Triggers

This document establishes standards for modular component design and native haptic feedback integration within the Harvi workspace.

---

## 1. Modular Button Design: The `OptionButton`

Standard buttons inside active quizzes must provide visual feedback depending on state transitions (idle, selected, correct, incorrect).

```typescript
// components/ui/OptionButton.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export interface OptionButtonProps {
  text: string;
  index: number;
  isSelected: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  showFeedback: boolean;
  disabled: boolean;
  onPress: () => void;
}

export function OptionButton({
  text,
  index,
  isSelected,
  isCorrect,
  isIncorrect,
  showFeedback,
  disabled,
  onPress,
}: OptionButtonProps) {
  const colors = useColors();
  const label = String.fromCharCode(65 + index); // maps 0 to A, 1 to B...

  let bg = colors.card;
  let border = colors.border;
  let textCol = colors.text;

  if (isSelected) {
    bg = colors.primary + "1A"; // 10% opacity primary color
    border = colors.primary;
    textCol = colors.primary;
  }

  if (showFeedback) {
    if (isCorrect) {
      bg = colors.success + "1A";
      border = colors.success;
      textCol = colors.success;
    } else if (isIncorrect) {
      bg = colors.destructive + "1A";
      border = colors.destructive;
      textCol = colors.destructive;
    }
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.letterBadge, { backgroundColor: isSelected ? colors.primary : colors.muted }]}>
          <Text style={styles.letterText}>{label}</Text>
        </View>
        <Text style={[styles.bodyText, { color: textCol }]}>{text}</Text>
      </View>
      {showFeedback && isCorrect && <Feather name="check-circle" size={18} color={colors.success} />}
      {showFeedback && isIncorrect && <Feather name="x-circle" size={18} color={colors.destructive} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
  },
  content: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  letterBadge: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  letterText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  bodyText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
});
```

---

## 2. Global Haptics Feedback Integration

To create a highly physical, premium interaction model, Harvi enforces **haptic feedback triggers** inside all form actions and quiz submissions:

```typescript
import * as Haptics from "expo-haptics";

export const TriggerHaptic = {
  light() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }
};
```

---

## 3. Usage Rules & Conventions

1.  **Always catch Haptics**: Standard haptics invocation methods return promises. Always wrap them in `.catch(() => {})` or wrap them in helper modules. This prevents the app from crashing inside headless test run environments or systems where haptics modules are missing.
2.  **Opacity Feedback**: Avoid plain `TouchableOpacity` which relies on browser-native opacity adjustments. Use `Pressable` with dynamic state-change callbacks mapping style variables synchronously.
3.  **Keyboard Gatekeepers**: Input screens must contain `<KeyboardProvider>` at the root and wrap content inside `<KeyboardAvoidingView>` to prevent keyboards from pushing input fields off-screen on smaller iOS/Android screens.
