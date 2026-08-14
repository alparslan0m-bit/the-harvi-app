/**
 * @file BackButton.tsx
 * @description Standard navigation back button component displaying a platform-authentic iOS-style chevron.
 * Features customizable hitSlop touch bounds, haptic tap feedback, and theme-aware color mapping.
 */
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import { Platform, StyleSheet, ViewStyle } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";
import { useColors } from "@/src/shared/hooks/useColors";

/** Props for the BackButton navigation component */
interface BackButtonProps {
  /** Navigation callback executed when tapped */
  onPress: () => void;
  /** Icon color override – defaults to `colors.foreground` */
  color?: string;
  /** Icon size – defaults to 32 */
  size?: number;
  /** Extends the touchable target area around the button (defaults to 14px) */
  hitSlop?: number;
  /** Optional container style overrides */
  style?: ViewStyle;
}

/**
 * Standard iOS-style back chevron button.
 * Uses the native `chevron-back` glyph via Ionicons for a crisp,
 * platform-authentic feel with light haptic feedback.
 */
export function BackButton({
  onPress,
  color,
  size = 32,
  hitSlop = 14,
  style,
}: BackButtonProps) {
  const colors = useColors();

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [onPress]);

  return (
    <AnimatedPressable
      feedback="opacity"
      onPress={handlePress}
      style={[styles.btn, style]}
      hitSlop={hitSlop}
    >
      <Ionicons
        name="chevron-back"
        size={size}
        color={color ?? colors.foreground}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
