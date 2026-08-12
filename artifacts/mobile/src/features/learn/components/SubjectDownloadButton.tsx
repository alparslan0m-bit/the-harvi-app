import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";
import { SubjectCacheStatus } from "@/src/features/learn/hooks/useSubjectCache";
import { AnimatedPressable } from "@/src/shared/components";
import { COLORS } from "@/src/shared/constants/theme";

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
    const pct =
      progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0;

    return (
      <Animated.View
        entering={FadeIn}
        style={[styles.pill, { backgroundColor: colors.muted }]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.label, { color: colors.foreground }]}>{pct}%</Text>
      </Animated.View>
    );
  }
  if (status === "downloaded") {
    const mint = COLORS.light.statCardFamilies[3];
    return (
      <Animated.View
        entering={FadeIn}
        style={[styles.pill, { backgroundColor: mint.fill }]}
      >
        <Feather name="check-circle" size={14} color={mint.solid} />
        <Text style={[styles.label, { color: mint.ink }]}>Downloaded</Text>
      </Animated.View>
    );
  }

  if (status === "stale") {
    return (
      <AnimatedPressable
        feedback="opacity"
        onPress={onPress}
        style={[
          styles.pill,
          {
            backgroundColor: colors.warning + "1A",
            borderWidth: 1,
            borderColor: colors.warning + "4D",
          },
        ]}
      >
        <Feather name="refresh-cw" size={13} color={colors.warning} />
        <Text style={[styles.label, { color: colors.warning }]}>
          {newQuestionCount > 0
            ? `${newQuestionCount} new question${newQuestionCount !== 1 ? "s" : ""}`
            : "Update available"}
        </Text>
      </AnimatedPressable>
    );
  }

  // "none" or "partial"
  return (
    <AnimatedPressable
      feedback="opacity"
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: colors.primary + "12",
          borderWidth: 1,
          borderColor: colors.primary + "30",
        },
      ]}
    >
      <Feather name="download" size={13} color={colors.primary} />
      <Text style={[styles.label, { color: colors.primary }]}>
        {status === "partial" ? "Resume download" : "Download offline"}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 22,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.1,
  },
});
