import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@/src/shared/hooks/useColors";
import { AnimatedPressable } from "@/src/shared/components";

interface QuizActiveHeaderProps {
  lectureName: string;
  currentIndex: number;
  totalQuestions: number;
  topPad: number;
  colors: ThemeColors;
  onClose: () => void;
}

export function QuizActiveHeader({
  lectureName,
  currentIndex,
  totalQuestions,
  topPad,
  colors,
  onClose,
}: QuizActiveHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop: topPad + 10 }]}>
      {/* Close button */}
      <AnimatedPressable
        feedback="opacity"
        onPress={onClose}
        style={[styles.iconBtn, { backgroundColor: colors.card }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={20} color={colors.foreground} />
      </AnimatedPressable>

      {/* Lecture name */}
      <Text
        style={[styles.lectureName, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {lectureName}
      </Text>

      {/* Empty placeholder to balance the close button */}
      <View style={{ width: 44, height: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lectureName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  focusPill: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  focusLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  focusTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  counterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexShrink: 0,
  },
  counterCurrent: {
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.2,
  },
  counterTotal: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
