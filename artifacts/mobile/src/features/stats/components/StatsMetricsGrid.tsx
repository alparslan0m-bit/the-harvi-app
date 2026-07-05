import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { StatCard } from "./StatCard";
import { useColors } from "@/src/shared/hooks/useColors";

interface StatsMetricsGridProps {
  totalQuizzes: number;
  totalQuestions: number;
  averageScore: number;
  bestScore: number;
}

/**
 * Grid displaying primary statistics cards.
 * Extracted from StatsScreen.
 */
export function StatsMetricsGrid({ totalQuizzes, totalQuestions, averageScore, bestScore }: StatsMetricsGridProps) {
  const colors = useColors();
  
  return (
    <View style={styles.statsGrid}>
      <View style={styles.statsRow}>
        <StatCard
          label="Quizzes"
          value={totalQuizzes}
          icon={<Feather name="check-square" size={18} color={colors.primary} />}
          accent
        />
        <StatCard
          label="Questions"
          value={totalQuestions}
          icon={<Feather name="help-circle" size={18} color={colors.mutedForeground} />}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Avg Score"
          value={`${Math.round(averageScore)}%`}
          icon={<Feather name="trending-up" size={18} color={colors.mutedForeground} />}
        />
        <StatCard
          label="Best Score"
          value={`${Math.round(bestScore)}%`}
          icon={<Feather name="award" size={18} color={colors.warning} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
});
