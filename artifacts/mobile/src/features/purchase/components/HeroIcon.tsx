// Extracted from PurchaseScreen.tsx — Hero icon with gradient orb and pulsing glow
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import type { ThemeColors } from "@/src/shared/hooks/useColors";

export const HeroIcon = React.memo(function HeroIcon({
  colors,
}: {
  colors: ThemeColors;
}) {
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      true,
    );
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.heroWrapper}>
      {/* Pulsing glow ring */}
      <Animated.View
        style={[
          styles.heroGlow,
          { backgroundColor: colors.primary + "20" },
          glowStyle,
        ]}
      />

      {/* Gradient orb */}
      <LinearGradient
        colors={[colors.primary, colors.accent + "CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroOrb}
      >
        <View style={styles.heroInnerBorder} />
        <Feather name="package" size={36} color="#fff" />

        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  heroWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroOrb: {
    width: 88,
    height: 88,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    zIndex: 1,
  },
  decorCircle1: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.12)",
    right: -16,
    top: -16,
  },
  decorCircle2: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    left: -8,
    bottom: -8,
  },
});
