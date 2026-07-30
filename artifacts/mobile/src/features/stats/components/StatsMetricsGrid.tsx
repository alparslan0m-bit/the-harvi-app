import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { StatCard } from "./StatCard";
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
export function StatsMetricsGrid({ totalQuizzes, totalQuestions, averageScore, bestScore }: StatsMetricsGridProps): React.ReactElement {
  const colors = useColors();
  const [quizzes, questions, avgScore, best] = colors.statCardFamilies as [PaletteFamily, PaletteFamily, PaletteFamily, PaletteFamily];

  return (
    <View style={styles.statsGrid}>
      <View style={styles.statsRow}>
        <StatCard
          label="Quizzes"
          value={totalQuizzes}
          icon={<Feather name="check-square" size={18} color={quizzes.solid} />}
          palette={quizzes}
        />
        <StatCard
          label="Questions"
          value={totalQuestions}
          icon={<Feather name="help-circle" size={18} color={questions.solid} />}
          palette={questions}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Avg Score"
          value={`${Math.round(averageScore)}%`}
          icon={<Feather name="trending-up" size={18} color={avgScore.solid} />}
          palette={avgScore}
        />
        <StatCard
          label="Best Score"
          value={`${Math.round(bestScore)}%`}
          icon={<Feather name="award" size={18} color={best.solid} />}
          palette={best}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
});
