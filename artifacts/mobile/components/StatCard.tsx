import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
}

export function StatCard({ label, value, icon, accent }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accent ? colors.primary : colors.card,
          borderColor: accent ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent ? "rgba(255,255,255,0.2)" : colors.muted }]}>
        {icon}
      </View>
      <Text style={[styles.value, { color: accent ? "#fff" : colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: accent ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.1,
  },
});
