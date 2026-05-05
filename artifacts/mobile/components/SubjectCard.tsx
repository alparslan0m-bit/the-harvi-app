import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import colors from "@/constants/colors";
import { Subject } from "@/types";

interface Props {
  subject: Subject;
  index: number;
  completedCount: number;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function SubjectCard({
  subject,
  index,
  completedCount,
  onPress,
}: Props) {
  const scale = useSharedValue(1);
  const gradient = colors.yearGradients[
    index % colors.yearGradients.length
  ] as [string, string];

  const total = subject.lectures.length;
  const progress = total > 0 ? completedCount / total : 0;
  const allDone = completedCount >= total && total > 0;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[styles.card, animStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 20 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20 });
      }}
      activeOpacity={1}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Title row */}
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>
            {subject.name}
          </Text>
          {/* Completion badge */}
          <View style={[styles.badge, allDone && styles.badgeDone]}>
            {allDone ? (
              <Text style={styles.badgeText}>✓</Text>
            ) : (
              <Text style={styles.badgeText}>
                {completedCount}/{total}
              </Text>
            )}
          </View>
        </View>

        {/* Progress bar */}
        {total > 0 && (
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.round(progress * 100)}%` as `${number}%` },
              ]}
            />
          </View>
        )}

        {/* Decorative circles */}
        <View style={styles.decorCircle} />
        <View style={styles.decorCircle2} />
      </LinearGradient>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  gradient: {
    padding: 20,
    paddingBottom: 16,
    minHeight: 90,
    overflow: "hidden",
    position: "relative",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    zIndex: 2,
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  badgeDone: {
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
    zIndex: 2,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  decorCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    right: -30,
    top: -30,
  },
  decorCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
    right: 50,
    bottom: -20,
  },
});
