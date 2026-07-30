import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";
import { THEME } from "@/src/shared/constants/theme";
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
        <Text
          style={[styles.title, { color: colors.cardForeground }]}
          numberOfLines={2}
        >
          {subject.name}
        </Text>
        {/* Completion badge */}
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.cardForeground + "15" },
            allDone && { backgroundColor: colors.cardForeground + "30" },
          ]}
        >
          <View style={styles.flexRow}>
            <Text style={[styles.badgeText, { color: colors.cardForeground }]}>
              {allDone ? "✓" : `${completedCount}/${total}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      {total > 0 && (
        <View
          style={[
            styles.barTrack,
            { backgroundColor: colors.cardForeground + "20" },
          ]}
        >
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.round(progress * 100)}%` as `${number}%`,
                backgroundColor: colors.cardForeground,
              },
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
    borderRadius: THEME.radius,
    padding: 24,
    paddingBottom: 20,
    minHeight: 110,
    justifyContent: "center",
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
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: "center",
  },
  badgeText: {
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
    overflow: "hidden",
    zIndex: 2,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
