import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/src/shared/hooks/useColors";
import { THEME } from "@/src/shared/constants/theme";
import { Year } from "@/src/shared/types";
import { AnimatedPressable } from "@/src/shared/components";

interface Props {
  year: Year;
  index: number;
  onPress: () => void;
}

export function YearCard({ year, index, onPress }: Props) {
  const colors = useColors();
  const color = colors.cardColors[index % colors.cardColors.length];

  return (
    <AnimatedPressable
      feedback="scale"
      style={[styles.card, { backgroundColor: color }]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.cardForeground }]}>
          {year.name}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: THEME.radius,
    padding: 24,
    minHeight: 100,
    justifyContent: "center",
  },
  content: { zIndex: 2 },
  title: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
});
