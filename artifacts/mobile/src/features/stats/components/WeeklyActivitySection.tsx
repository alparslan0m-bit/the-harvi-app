import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { WeeklyChart } from "./WeeklyChart";
import { useColors } from "@/src/shared/hooks/useColors";
import { UserStats } from "@/src/shared/types";

export function WeeklyActivitySection({ weekData }: { weekData: UserStats["weekly_activity"] }) {
  const colors = useColors();
  const total = weekData.reduce((s, d) => s + d.count, 0);
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: colors.primary + "1A" },
            ]}
          >
            <Feather name="calendar" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Weekly Activity
          </Text>
        </View>
        <Text style={[styles.weekTotal, { color: colors.mutedForeground }]}>
          {total} quiz{total !== 1 ? "zes" : ""}
        </Text>
      </View>
      <View style={{ marginTop: 24 }}>
        <WeeklyChart data={weekData.map(d => ({ day: d.day, count: d.count, isToday: d.isToday }))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
  weekTotal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
