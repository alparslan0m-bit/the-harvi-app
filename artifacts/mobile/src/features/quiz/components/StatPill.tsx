import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors, PaletteFamily } from "@/src/shared/hooks/useColors";

interface StatPillProps {
  value: number;
  label: string;
  color?: string | undefined;
  family?: PaletteFamily | undefined;
  icon: React.ComponentProps<typeof Feather>["name"];
}

export function StatPill({ value, label, color, family, icon }: StatPillProps) {
  const colors = useColors();
  
  const bg = family ? family.fill : (color ? color + "26" : colors.card);
  const border = family ? "transparent" : (color ? color + "4D" : colors.border);
  const iconColor = family ? family.solid : (color || colors.foreground);
  const numColor = family ? family.ink : colors.foreground;
  const labelColor = family ? family.ink : colors.mutedForeground;

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: bg, borderColor: border, borderWidth: family ? 0 : 1.5 },
      ]}
    >
      <Feather name={icon} size={22} color={iconColor} />
      <Text style={[styles.pillNum, { color: numColor }]}>
        {value}
      </Text>
      <Text style={[styles.pillLabel, { color: labelColor, opacity: family ? 0.85 : 1 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 6,
    borderRadius: 24,
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  pillNum: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.8,
    zIndex: 2,
  },
  pillLabel: { 
    fontSize: 12, 
    fontFamily: "Inter_600SemiBold", 
    zIndex: 2 
  },
});
