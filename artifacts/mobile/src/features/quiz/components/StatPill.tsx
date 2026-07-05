import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/src/shared/hooks/useColors";

interface StatPillProps {
  value: number;
  label: string;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}

export function StatPill({ value, label, color, icon }: StatPillProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: color + "14", borderColor: color + "35" },
      ]}
    >
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.pillNum, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.pillLabel, { color: colors.mutedForeground }]}>
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
    borderRadius: 22,
    borderWidth: 1,
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
