import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { AnsweredState } from "@/types";
import { ThemeColors } from "@/hooks/useColors";
import { EdgeInsets } from "react-native-safe-area-context";

interface QuizNextButtonProps {
  answered: AnsweredState | null;
  isLast: boolean;
  colors: ThemeColors;
  onNext: () => void;
  insets: EdgeInsets;
}

export function QuizNextButton({
  answered,
  isLast,
  colors,
  onNext,
  insets,
}: QuizNextButtonProps) {
  if (!answered) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={[
        styles.nextWrap,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: colors.primary }]}
        onPress={onNext}
        activeOpacity={0.88}
      >
        <Text style={styles.nextBtnText}>
          {isLast ? "See Results" : "Next Question"}
        </Text>
        <Feather
          name={isLast ? "award" : "arrow-right"}
          size={18}
          color="#fff"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  nextWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
});
