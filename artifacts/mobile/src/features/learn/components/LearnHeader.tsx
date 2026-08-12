import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/src/shared/hooks/useColors";

export function LearnHeader({ topPad }: { topPad: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: topPad + 14,
          borderBottomColor: "transparent",
          backgroundColor: colors.headerBackground,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.headerForeground }]}>
        Harvi
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 38,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
});
