import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/src/shared/hooks/useColors";
import { THEME } from "@/src/shared/constants/theme";
import { Module } from "@/src/shared/types";
import { AnimatedPressable } from "@/src/shared/components";

interface Props {
  module: Module;
  index: number;
  onPress: () => void;
  hasAccess?: boolean;
  isFree?: boolean;
}

export function ModuleCard({
  module,
  index,
  onPress,
  hasAccess,
  isFree,
}: Props) {
  const colors = useColors();
  const color =
    colors.cardColors[index % colors.cardColors.length] ?? colors.cardColors[0];

  return (
    <AnimatedPressable
      feedback="scale"
      style={[styles.card, { backgroundColor: color }]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.cardForeground }]}>
          {module.name}
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
