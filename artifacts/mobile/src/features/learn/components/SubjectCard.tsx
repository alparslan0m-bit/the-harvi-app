import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";
import { Subject } from "@/src/shared/types";

interface Props {
  subject: Subject;
  index: number;
  completedCount: number;
  isLocked?: boolean;
  isFreePreview?: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function SubjectCard({
  subject,
  index,
  completedCount,
  isLocked,
  isFreePreview,
  onPress,
}: Props) {
  const scale = useSharedValue(1);
  const colors = useColors();
  const color = colors.cardColors[index % colors.cardColors.length];

  const total = subject.lectures.length;
  const progress = total > 0 ? completedCount / total : 0;
  const allDone = completedCount >= total && total > 0;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[styles.card, animStyle, { backgroundColor: color }]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }}
      activeOpacity={0.9}
    >
      {/* Title row */}
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={2}>
          {subject.name}
        </Text>
        {/* Completion badge */}
        <View style={[styles.badge, allDone && styles.badgeDone]}>
          <View style={styles.flexRow}>
            <Text style={styles.badgeText}>
              {allDone ? "✓" : `${completedCount}/${total}`}
            </Text>
          </View>
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
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 24,
    paddingBottom: 20,
    minHeight: 110,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    zIndex: 2,
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: "center",
  },
  badgeDone: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    zIndex: 2,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
});
