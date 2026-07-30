import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { StatCard } from "./StatCard";

/**
 * Candy Pastel accent solids — used for icon tinting inside each card.
 * Must stay in sync with StatCard's PASTEL_FAMILIES.
 */
const ICON_COLORS = {
  coral:    "#FF8A5B",
  sky:      "#5CB8F0",
  lavender: "#A88BF0",
  sunshine: "#FFC93C",
} as const;

interface StatsMetricsGridProps {
  totalQuizzes: number;
  totalQuestions: number;
  averageScore: number;
  bestScore: number;
}

/**
 * Grid displaying primary statistics cards.
 * Each card gets a distinct pastel family per §1.2 / §1.6.
 */
export function StatsMetricsGrid({ totalQuizzes, totalQuestions, averageScore, bestScore }: StatsMetricsGridProps): React.ReactElement {
  return (
    <View style={styles.statsGrid}>
      <View style={styles.statsRow}>
        <StatCard
          label="Quizzes"
          value={totalQuizzes}
          icon={<Feather name="check-square" size={18} color={ICON_COLORS.coral} />}
          colorFamily="coral"
        />
        <StatCard
          label="Questions"
          value={totalQuestions}
          icon={<Feather name="help-circle" size={18} color={ICON_COLORS.sky} />}
          colorFamily="sky"
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Avg Score"
          value={`${Math.round(averageScore)}%`}
          icon={<Feather name="trending-up" size={18} color={ICON_COLORS.lavender} />}
          colorFamily="lavender"
        />
        <StatCard
          label="Best Score"
          value={`${Math.round(bestScore)}%`}
          icon={<Feather name="award" size={18} color={ICON_COLORS.sunshine} />}
          colorFamily="sunshine"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
});
