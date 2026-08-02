import React from "react";
import { StyleSheet, Text } from "react-native";

import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { AnsweredState } from "@/src/shared/types";
import { ThemeColors } from "@/src/shared/hooks/useColors";
import { THEME } from "@/src/shared/constants/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/src/shared/components";

interface QuizNextButtonProps {
  answered?: AnsweredState | null;
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
      <AnimatedPressable feedback="scale"
        style={[styles.nextBtn, { backgroundColor: colors.primary }]}
        onPress={onNext}
        
      >
        <Text style={styles.nextBtnText}>
          {isLast ? "See Results" : "Next Question"}
        </Text>
        <Feather
          name={isLast ? "award" : "arrow-right"}
          size={18}
          color="#fff"
        />
      </AnimatedPressable>
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
    borderTopWidth: 0,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 999,
    gap: 8,
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
});
