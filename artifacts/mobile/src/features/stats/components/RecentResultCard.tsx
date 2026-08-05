import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useColors, type PaletteFamily } from "@/src/shared/hooks/useColors";
import { THEME } from "@/src/shared/constants/theme";
import { QuizResult } from "@/src/shared/types";

/** Soft shadow for white cards — §3.1 */
const SOFT_SHADOW = Platform.select({
  ios: {
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 2 },
  default: {},
});

interface Props {
  result: QuizResult;
}

export function RecentResultCard({ result }: Props): React.ReactElement {
  const colors = useColors();

  // Semantic score palettes from theme: Mint (high), Sunshine (mid), neutral (low)
  const mint = colors.statCardFamilies[3] as PaletteFamily;
  const sunshine = colors.streakFamily;
  const palette =
    result.score >= 80 ? mint :
    result.score >= 50 ? sunshine :
    { fill: colors.muted, solid: colors.mutedForeground, ink: colors.mutedForeground };

  const formattedDate = new Date(result.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, SOFT_SHADOW]}>
      <View style={styles.left}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {result.lecture_name}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formattedDate}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: palette.fill }]}>
        <Text style={[styles.scoreText, { color: palette.ink }]}>
          {Math.round(result.score)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: THEME.radius,
    // No borderWidth — §2.3
    marginBottom: 10,
  },
  left: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999, // §2.1 pill shape for tappable/badge elements
  },
  scoreText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
