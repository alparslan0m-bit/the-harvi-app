import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import { Platform, StyleSheet, ViewStyle } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";
import { useColors } from "@/src/shared/hooks/useColors";

interface BackButtonProps {
  onPress: () => void;
  /** Icon color override – defaults to `colors.foreground` */
  color?: string;
  /** Icon size – defaults to 28 */
  size?: number;
  hitSlop?: number;
  style?: ViewStyle;
}

/**
 * Standard iOS-style back chevron button.
 * Uses the native `chevron.backward` glyph via Ionicons for a crisp,
 * platform-authentic feel with no container background.
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
