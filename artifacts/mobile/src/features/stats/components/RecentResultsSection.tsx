import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { RecentResultCard } from "./RecentResultCard";
import { useColors, type PaletteFamily } from "@/src/shared/hooks/useColors";
import { UserStats } from "@/src/shared/types";

export function RecentResultsSection({ results }: { results: UserStats["recent_results"] }): React.ReactElement {
  const colors = useColors();
  const lavender = colors.statCardFamilies[2] as PaletteFamily;
  return (
    <View style={styles.recentSection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: lavender.fill }]}>
            <Feather name="clock" size={14} color={lavender.solid} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent Results
          </Text>
        </View>
      </View>
      {results.slice(0, 10).map((result, i) => (
        <RecentResultCard key={i} result={result} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  recentSection: { paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 12, // §6.3 sm
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
});
