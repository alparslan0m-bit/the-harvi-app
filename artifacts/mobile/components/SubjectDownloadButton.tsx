import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { SubjectCacheStatus } from "@/hooks/useSubjectCache";

interface Props {
  status: SubjectCacheStatus;
  progress: { done: number; total: number };
  newQuestionCount: number;
  onPress: () => void;
}

export function SubjectDownloadButton({
  status,
  progress,
  newQuestionCount,
  onPress,
}: Props) {
  const colors = useColors();

  if (status === "downloading") {
    const pct = progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

    return (
      <Animated.View entering={FadeIn} style={[styles.pill, { backgroundColor: colors.muted }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.label, { color: colors.foreground }]}>
          {pct}%
        </Text>
      </Animated.View>
    );
  }

  if (status === "downloaded") {
    return (
      <Animated.View entering={FadeIn} style={[styles.pill, { backgroundColor: colors.success + "1A" }]}>
        <Feather name="check-circle" size={14} color={colors.success} />
        <Text style={[styles.label, { color: colors.success }]}>Downloaded</Text>
      </Animated.View>
    );
  }

  if (status === "stale") {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.pill, { backgroundColor: colors.warning + "1A", borderWidth: 1, borderColor: colors.warning + "4D" }]}
      >
        <Feather name="refresh-cw" size={13} color={colors.warning} />
        <Text style={[styles.label, { color: colors.warning }]}>
          {newQuestionCount > 0
            ? `${newQuestionCount} new question${newQuestionCount !== 1 ? "s" : ""}`
            : "Update available"}
        </Text>
      </TouchableOpacity>
    );
  }

  // "none" or "partial"
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.pill, { backgroundColor: colors.primary + "12", borderWidth: 1, borderColor: colors.primary + "30" }]}
    >
      <Feather name="download" size={13} color={colors.primary} />
      <Text style={[styles.label, { color: colors.primary }]}>
        {status === "partial" ? "Resume download" : "Download offline"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
});
