import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/src/shared/hooks/useColors";

export function EmptyNudge() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.nudgeCard,
        {
          backgroundColor: colors.primary + "12",
          borderColor: colors.primary + "33",
        },
      ]}
    >
      <View
        style={[styles.nudgeIcon, { backgroundColor: colors.primary + "20" }]}
      >
        <Feather name="bar-chart-2" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.nudgeTitle, { color: colors.foreground }]}>
        No stats yet
      </Text>
      <Text style={[styles.nudgeText, { color: colors.mutedForeground }]}>
        Complete your first quiz to start tracking your performance and
        progress.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nudgeCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  nudgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nudgeTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  nudgeText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
