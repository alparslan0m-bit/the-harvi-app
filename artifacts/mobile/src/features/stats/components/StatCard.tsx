import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { THEME } from "@/src/shared/constants/theme";

/**
 * Candy Pastel accent families — fill (bg), solid (icon/accent), ink (text-on-fill).
 * From the design-system.md six-hue palette.
 */
const PASTEL_FAMILIES = {
  coral:    { fill: "#FFDCCB", solid: "#FF8A5B", ink: "#7A3A1E" },
  sunshine: { fill: "#FFEFB0", solid: "#FFC93C", ink: "#6B4E00" },
  mint:     { fill: "#C9F0DE", solid: "#4FCB94", ink: "#0F5C3C" },
  sky:      { fill: "#CFE8FA", solid: "#5CB8F0", ink: "#134A6B" },
  lavender: { fill: "#E3DBFA", solid: "#A88BF0", ink: "#3E2E70" },
  rose:     { fill: "#FBD6E4", solid: "#F787AE", ink: "#7A1F42" },
} as const;

export type PastelFamily = keyof typeof PASTEL_FAMILIES;

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorFamily: PastelFamily;
}

export function StatCard({ label, value, icon, colorFamily }: Props): React.ReactElement {
  const palette = PASTEL_FAMILIES[colorFamily];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.fill },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: palette.solid + "22" }]}>
          {icon}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.value, { color: palette.ink }]}>{value}</Text>
        <Text style={[styles.label, { color: palette.ink, opacity: 0.75 }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 18,
    borderRadius: THEME.radius,
    // No borderWidth — §2.3: color fill provides separation
    minHeight: 110,
    justifyContent: "space-between",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12, // §6.3 sm
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    gap: 0,
  },
  value: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0,
  },
});
