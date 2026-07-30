import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { THEME } from "@/src/shared/constants/theme";
import type { PaletteFamily } from "@/src/shared/hooks/useColors";

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  palette: PaletteFamily;
}

export function StatCard({ label, value, icon, palette }: Props): React.ReactElement {
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
