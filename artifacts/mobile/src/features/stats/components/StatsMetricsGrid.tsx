import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors, type PaletteFamily } from "@/src/shared/hooks/useColors";

interface StatsMetricsGridProps {
  totalQuizzes: number;
  totalQuestions: number;
  averageScore: number;
  bestScore: number;
}

/**
 * Grid displaying primary statistics cards.
 * Palettes are pulled from the active theme so they adapt on theme switch.
 */
export function StatsMetricsGrid({
  totalQuizzes,
  totalQuestions,
  averageScore,
  bestScore,
}: StatsMetricsGridProps): React.ReactElement {
  const colors = useColors();
  const [quizzes, questions, avgScore] = colors.statCardFamilies as [
    PaletteFamily,
    PaletteFamily,
    PaletteFamily,
    PaletteFamily,
  ];

  return (
    <View style={styles.container}>
      {/* Top Pills Row */}
      <View style={styles.pillsRow}>
        <View style={[styles.pill, { backgroundColor: quizzes.fill + "80" }]}>
          <View
            style={[
              styles.pillIconWrap,
              { backgroundColor: quizzes.fill, borderColor: colors.background },
            ]}
          >
            <Feather name="check-square" size={20} color={quizzes.ink} />
          </View>
          <Text
            style={[styles.pillValue, { color: colors.foreground }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {totalQuizzes}
          </Text>
          <Text
            style={[
              styles.pillLabel,
              { color: colors.foreground, opacity: 0.7 },
            ]}
            numberOfLines={1}
          >
            Quizzes
          </Text>
        </View>

        <View style={[styles.pill, { backgroundColor: questions.fill + "80" }]}>
          <View
            style={[
              styles.pillIconWrap,
              {
                backgroundColor: questions.fill,
                borderColor: colors.background,
              },
            ]}
          >
            <Feather name="help-circle" size={20} color={questions.ink} />
          </View>
          <Text
            style={[styles.pillValue, { color: colors.foreground }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {totalQuestions}
          </Text>
          <Text
            style={[
              styles.pillLabel,
              { color: colors.foreground, opacity: 0.7 },
            ]}
            numberOfLines={1}
          >
            Questions
          </Text>
        </View>

        <View
          style={[
            styles.pill,
            styles.pillDashed,
            { borderColor: colors.mutedForeground + "40" },
          ]}
        >
          <View
            style={[
              styles.pillIconWrap,
              { backgroundColor: colors.muted, borderColor: colors.background },
            ]}
          >
            <Feather name="award" size={20} color={colors.foreground} />
          </View>
          <Text
            style={[styles.pillValue, { color: colors.foreground }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {Math.round(bestScore)}%
          </Text>
          <Text
            style={[
              styles.pillLabel,
              { color: colors.foreground, opacity: 0.7 },
            ]}
            numberOfLines={1}
          >
            Best Score
          </Text>
        </View>
      </View>

      {/* Prominent Avg Score (No Card Background) */}
      <View style={styles.prominentSection}>
        <Text
          style={[styles.prominentValue, { color: colors.foreground }]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {Math.round(averageScore)}%
        </Text>
        <Text
          style={[
            styles.prominentLabel,
            { color: colors.foreground, opacity: 0.8 },
          ]}
        >
          Average progress
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 16,
    paddingTop: 24, // extra space for the overlapping icons
  },
  pillsRow: {
    flexDirection: "row",
    gap: 6,
  },
  pill: {
    flex: 1,
    alignItems: "center",
    paddingTop: 36, // space for the overlapping icon
    paddingBottom: 24,
    paddingHorizontal: 4,
    borderRadius: 40,
    position: "relative",
  },
  pillDashed: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  pillIconWrap: {
    position: "absolute",
    top: -24, // overlaps the top edge
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pillValue: {
    fontSize: 26,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  pillLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  prominentSection: {
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 8, // slight inset to align nicely
  },
  prominentValue: {
    fontSize: 84,
    lineHeight: 90,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -3,
    marginBottom: 4,
  },
  prominentLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
