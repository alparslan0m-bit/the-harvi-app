// Extracted from PurchaseScreen.tsx — Gradient CTA button with spring press animation
import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import type { ThemeColors } from "@/src/shared/hooks/useColors";
import { AnimatedTouchable, SPRING_CONFIG } from "./purchase.constants";
import { sharedStyles } from "./purchase.styles";

export const PremiumButton = React.memo(function PremiumButton({
  onPress,
  disabled,
  loading,
  icon,
  label,
  colors,
}: {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
  icon: string;
  label: string;
  colors: ThemeColors;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[sharedStyles.ctaOuter, animStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      {disabled ? (
        <View
          style={[
            sharedStyles.ctaInner,
            { backgroundColor: colors.mutedForeground },
          ]}
        >
          <Feather name={icon as any} size={18} color="#fff" />
          <Text style={sharedStyles.ctaText}>{label}</Text>
        </View>
      ) : (
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
          style={sharedStyles.ctaInner}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name={icon as any} size={18} color="#fff" />
              <Text style={sharedStyles.ctaText}>{label}</Text>
            </>
          )}
        </LinearGradient>
      )}
    </AnimatedTouchable>
  );
});
