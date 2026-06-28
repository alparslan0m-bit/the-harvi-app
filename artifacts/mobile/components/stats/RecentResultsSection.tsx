import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { RecentResultCard } from "@/components";
import { useColors } from "@/hooks/useColors";
import { UserStats } from "@/types";

export function RecentResultsSection({ results }: { results: UserStats["recent_results"] }) {
  const colors = useColors();
  return (
    <View style={styles.recentSection}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Recent Results
      </Text>
      {results.slice(0, 10).map((result, i) => (
        <RecentResultCard key={i} result={result} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  recentSection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
});
