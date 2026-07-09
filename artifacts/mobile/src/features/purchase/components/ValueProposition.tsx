// ValueProposition — persuasive stats pills for the purchase screen
// Shows total subjects, lectures, and questions in the module.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { ThemeColors } from "@/src/shared/hooks/useColors";

interface StatItem {
  icon: keyof typeof Feather.glyphMap;
  count: number;
  label: string;
}

export const ValueProposition = React.memo(function ValueProposition({
  totalSubjects,
  totalLectures,
  totalQuestions,
  colors,
}: {
  totalSubjects: number;
  totalLectures: number;
  totalQuestions: number;
  colors: ThemeColors;
}) {
  const stats: StatItem[] = [
    { icon: "book", count: totalSubjects, label: "Subjects" },
    { icon: "file-text", count: totalLectures, label: "Lectures" },
    { icon: "help-circle", count: totalQuestions, label: "Questions" },
  ].filter((s) => s.count > 0);

  if (stats.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      style={styles.container}
    >
      {stats.map((stat, i) => (
        <Animated.View
          key={stat.label}
          entering={FadeInDown.duration(400).delay(250 + i * 80)}
          style={[
            styles.pill,
            {
              backgroundColor: colors.primary + "0D",
              borderColor: colors.primary + "20",
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primary + "1A" },
            ]}
          >
            <Feather name={stat.icon} size={14} color={colors.primary} />
          </View>
          <Text style={[styles.count, { color: colors.foreground }]}>
            {stat.count}
          </Text>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {stat.label}
          </Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
});
