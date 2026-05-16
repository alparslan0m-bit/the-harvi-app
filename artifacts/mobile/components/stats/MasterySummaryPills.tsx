import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

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

export function MasterySummaryPills({ counts }: { counts: { strong: number; improving: number; weak: number } }) {
  const colors = useColors();
  return (
    <View style={styles.pillRow}>
      <SummaryPill count={counts.strong}    label="Strong"    bg={colors.success + "1A"} textColor={colors.success} />
      <SummaryPill count={counts.improving} label="Improving" bg={colors.warning + "1A"} textColor={colors.warning} />
      <SummaryPill count={counts.weak}      label="Needs Work" bg={colors.destructive + "1A"} textColor={colors.destructive} />
    </View>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 20, marginBottom: 4 },
});
