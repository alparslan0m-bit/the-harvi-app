import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";

/** Candy Pastel Sunshine family */
const SUNSHINE = {
  fill: "#FFEFB0",
  solid: "#FFC93C",
  ink: "#6B4E00",
} as const;

/** Soft shadow for white cards — §3.1 */
const SOFT_SHADOW = Platform.select({
  ios: {
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 3 },
  default: {},
});

function streakMessage(streak: number): string {
  if (streak === 0) return "Study today to start a streak!";
  if (streak === 1) return "Great start — come back tomorrow!";
  if (streak < 5) return "You're building momentum. Keep it up!";
  if (streak < 10) return "Impressive consistency — don't break it!";
  if (streak < 30) return "You're on fire! Keep the streak alive!";
  return "Legendary dedication. You're unstoppable!";
}

export function StreakCard({ streak }: { streak: number }): React.ReactElement {
  const colors = useColors();

  const zapScale = useSharedValue(1);
  useEffect(() => {
    if (streak > 0) {
      zapScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 600, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  const zapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zapScale.value }],
  }));

  const isActive = streak > 0;

  // §1.2: active uses Sunshine fill, inactive uses white card with soft shadow
  const cardBg = isActive ? SUNSHINE.fill : colors.card;
  const iconBg = isActive ? SUNSHINE.solid + "22" : colors.muted;
  const iconColor = isActive ? SUNSHINE.solid : colors.mutedForeground;
  const numColor = isActive ? SUNSHINE.ink : colors.mutedForeground;
  const textColor = isActive ? SUNSHINE.ink : colors.mutedForeground;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardBg },
        // §3.2: white cards get soft shadow, colored cards don't
        !isActive ? SOFT_SHADOW : undefined,
      ]}
    >
      {isActive && (
        <LinearGradient
          colors={[SUNSHINE.solid + "08", SUNSHINE.solid + "14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Animated.View style={zapStyle}>
            <Feather name="zap" size={22} color={iconColor} />
          </Animated.View>
        </View>
        <View style={styles.numCol}>
          <Text style={[styles.num, { color: numColor }]}>{streak}</Text>
          <Text style={[styles.label, { color: textColor, opacity: 0.75 }]}>day streak</Text>
        </View>
      </View>
      <Text style={[styles.message, { color: textColor, opacity: 0.8 }]}>
        {streakMessage(streak)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 28, // §6.3 lg
    // No borderWidth — §2.3
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    overflow: "hidden",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12, // §6.3 sm
    alignItems: "center",
    justifyContent: "center",
  },
  numCol: { alignItems: "flex-start" },
  num: { fontSize: 28, fontFamily: "Nunito_800ExtraBold", letterSpacing: -1, lineHeight: 32 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 1 },
  message: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18, textAlign: "right" },
});
