// Extracted from PurchaseScreen.tsx — Post-purchase success state
import React from "react";
import { Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { ThemeColors } from "@/src/shared/hooks/useColors";
import { AnimatedTouchable, SPRING_CONFIG } from "./purchase.constants";
import { sharedStyles } from "./purchase.styles";

export const SuccessState = React.memo(function SuccessState({
  message,
  onDone,
  colors,
}: {
  message: string;
  onDone: () => void;
  colors: ThemeColors;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(14)}
      style={styles.successBox}
    >
      {/* Success gradient orb */}
      <Animated.View entering={FadeInDown.duration(500)}>
        <LinearGradient
          colors={[colors.success, colors.success + "AA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.successOrb}
        >
          <Feather name="check" size={32} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.duration(400).delay(100)}
        style={[styles.successText, { color: colors.foreground }]}
      >
        {message}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.duration(400).delay(200)}
        style={{ width: "100%" }}
      >
        <AnimatedTouchable
          style={[sharedStyles.ctaOuter, animStyle]}
          onPress={onDone}
          onPressIn={() => {
            scale.value = withSpring(0.96, SPRING_CONFIG);
          }}
          onPressOut={() => {
            scale.value = withSpring(1, SPRING_CONFIG);
          }}
          activeOpacity={1}
        >
          <LinearGradient
            colors={[colors.success, colors.success + "CC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            style={sharedStyles.ctaInner}
          >
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={sharedStyles.ctaText}>Done</Text>
          </LinearGradient>
        </AnimatedTouchable>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  successBox: {
    alignItems: "center",
    gap: 24,
    width: "100%",
  },
  successOrb: {
    width: 72,
    height: 72,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  successText: {
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 26,
  },
});
