import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { Lecture } from "@/types";

interface Props {
  lecture: Lecture;
  index: number;
  completed?: boolean;
  /** True when new questions were added since this lecture was last downloaded */
  hasNewQuestions?: boolean;
  /** True when questions are pre-cached for offline use */
  isCached?: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function LectureCard({
  lecture,
  index,
  completed = false,
  hasNewQuestions = false,
  isCached = false,
  onPress,
}: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[
        styles.card,
        {
          backgroundColor: completed ? colors.success + "0F" : colors.background,
          borderColor: completed ? colors.success + "4D" : colors.border,
        },
        animStyle,
      ]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 20 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20 });
      }}
      activeOpacity={1}
    >
      {/* Index / completed badge */}
      <View
        style={[
          styles.indexBadge,
          { backgroundColor: completed ? colors.success + "22" : colors.muted },
        ]}
      >
        <Text
          style={[
            styles.indexText,
            { color: completed ? colors.success : colors.mutedForeground },
          ]}
        >
          {index + 1}
        </Text>
      </View>

      <View style={styles.textCol}>
        {/* Title row with optional "NEW" badge */}
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {lecture.name}
          </Text>
          {hasNewQuestions && (
            <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        {/* Meta row: question count + cached indicator */}
        <View style={styles.metaRow}>
          {lecture.question_count != null && lecture.question_count > 0 && (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {lecture.question_count} questions
            </Text>
          )}
          {isCached && !hasNewQuestions && (
            <View style={styles.cachedChip}>
              <Feather name="download" size={9} color={colors.primary} />
              <Text style={[styles.cachedText, { color: colors.primary }]}>
                downloaded
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right icon */}
      {completed ? (
        <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
          <Feather name="check" size={14} color="#fff" />
        </View>
      ) : (
        <View
          style={[styles.playIcon, { backgroundColor: colors.primary + "15" }]}
        >
          <Feather name="play-circle" size={18} color={colors.primary} />
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  textCol: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.3,
    lineHeight: 22,
    flexShrink: 1,
  },
  newBadge: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cachedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cachedText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
