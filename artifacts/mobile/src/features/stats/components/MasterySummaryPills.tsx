import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/src/shared/hooks/useColors";

function SummaryPill({
  count, label, bg, textColor,
}: { count: number; label: string; bg: string; textColor: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: bg }]}>
      <Text style={[pillStyles.count, { color: textColor }]}>{count}</Text>
      <Text style={[pillStyles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 16, gap: 2 },
  count: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium" },
});

import { COLORS } from "@/src/shared/constants/theme";

export function MasterySummaryPills({ counts }: { counts: { strong: number; improving: number; weak: number } }) {
  const mint = COLORS.light.statCardFamilies[3]; // Mint
  const sunshine = COLORS.light.streakFamily;    // Sunshine
  const coral = COLORS.light.statCardFamilies[0]; // Coral

  return (
    <View style={styles.pillRow}>
      <SummaryPill count={counts.strong}    label="Strong"     bg={mint.fill}     textColor={mint.ink} />
      <SummaryPill count={counts.improving} label="Improving"  bg={sunshine.fill} textColor={sunshine.ink} />
      <SummaryPill count={counts.weak}      label="Needs Work" bg={coral.fill}    textColor={coral.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 20, marginBottom: 4 },
});
