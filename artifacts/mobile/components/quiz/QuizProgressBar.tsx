import React from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { ThemeColors } from "@/hooks/useColors";

interface QuizProgressBarProps {
  progressStyle: StyleProp<ViewStyle>;
  colors: ThemeColors;
}

export function QuizProgressBar({ progressStyle, colors }: QuizProgressBarProps) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
      <Animated.View
        style={[
          styles.progressFill,
          { backgroundColor: colors.primary },
          progressStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 5, width: "100%" },
  progressFill: { height: "100%", borderRadius: 3 },
});
