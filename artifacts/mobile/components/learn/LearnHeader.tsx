import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function LearnHeader({ topPad }: { topPad: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: topPad + 14,
          borderBottomColor: "transparent",
          backgroundColor: colors.background,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Harvi</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Questions you need
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 38,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: -2 },
});
