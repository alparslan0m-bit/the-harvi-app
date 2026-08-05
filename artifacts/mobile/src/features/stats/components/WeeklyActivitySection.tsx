import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { WeeklyChart } from "./WeeklyChart";
import { useColors, type PaletteFamily } from "@/src/shared/hooks/useColors";
import { UserStats } from "@/src/shared/types";
import { THEME } from "@/src/shared/constants/theme";



/** Soft shadow for white cards — §3.1 */
const SOFT_SHADOW = Platform.select({
  ios: {
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 3 },
  default: {},
});

export function WeeklyActivitySection({ weekData }: { weekData: UserStats["weekly_activity"] }): React.ReactElement {
  const colors = useColors();
  const skyPalette = colors.statCardFamilies[1] as PaletteFamily;
  const total = weekData.reduce((s, d) => s + d.count, 0);
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.card },
        SOFT_SHADOW,
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: skyPalette.fill },
            ]}
          >
            <Feather name="calendar" size={14} color={skyPalette.solid} />
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
        <WeeklyChart data={weekData.map(d => ({ day: d.day, count: d.count, isToday: !!d.isToday }))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: THEME.radius, // unified lg radius
    // No borderWidth — §2.3
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
    borderRadius: 12, // §6.3 sm
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
