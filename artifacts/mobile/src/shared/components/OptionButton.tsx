/**
 * @file OptionButton.tsx
 * @description Interactive quiz answer option component featuring Reanimated keyframe shake animations 
 * for incorrect choices, soft pastel state highlights (Mint for correct, Coral for wrong), and letter badges (A, B, C, D).
 */
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";
import { AnsweredState } from "@/src/shared/types";
import { AnimatedPressable } from "@/src/shared/components";

/**
 * Interface defining the properties for rendering an interactive quiz option button.
 */
interface Props {
  /** The localized plain-text body of the option */
  text: string;
  /** Zero-based positional index of the option (0 = A, 1 = B, 2 = C, etc.) */
  index: number;
  /** Active quiz answer state object (containing selected and correct option indices), or null if pending */
  answered?: AnsweredState | null;
  /** Callback fired when the user selects this option before an answer is revealed */
  onSelect: (i: number) => void;
}

/**
 * Renders an animated quiz option button with contextual feedback and letter badge.
 * 
 * @param props - Component props
 * @returns Animated option button element
 */
export function OptionButton({ text, index, answered, onSelect }: Props) {
  const colors = useColors();
  const translateX = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: withTiming(isDimmed ? 0.45 : 1, { duration: 150 }),
  }));

  // Shake wrong when answer is revealed
  useEffect(() => {
    if (!answered) return;
    if (index === answered.selected && index !== answered.correct) {
      translateX.value = withSequence(
        withTiming(-6, { duration: 40 }),
        withTiming(6, { duration: 40 }),
        withTiming(-4, { duration: 40 }),
        withTiming(4, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  const isCorrect = !!answered && index === answered.correct;
  const isWrong = !!answered && index === answered.selected && !isCorrect;
  const isDimmed = !!answered && !isCorrect && !isWrong;

  let bgColor: string = colors.card;
  let borderColor: string = colors.border;
  let textColor: string = (colors as any).cardForeground || colors.foreground;

  let labelBg = colors.muted;
  let labelColor = colors.foreground;
  let iconColor = colors.foreground;

  const mintFamily = { fill: "#C9F0DE", solid: "#4FCB94", ink: "#0F5C3C" };
  const coralFamily = { fill: "#FFDCCB", solid: "#FF8A5B", ink: "#7A3A1E" };

  if (isCorrect) {
    bgColor = mintFamily.fill;
    borderColor = "transparent";
    textColor = mintFamily.ink;
    labelBg = mintFamily.solid;
    labelColor = "#ffffff";
    iconColor = mintFamily.solid;
  } else if (isWrong) {
    bgColor = coralFamily.fill;
    borderColor = "transparent";
    textColor = coralFamily.ink;
    labelBg = coralFamily.solid;
    labelColor = "#ffffff";
    iconColor = coralFamily.solid;
  }

  const shadowStyle = {}; // Removed muddy shadow

  const label = String.fromCharCode(65 + index);

  return (
    <Animated.View style={animStyle}>
      <AnimatedPressable
        feedback="opacity"
        style={[
          styles.option,
          { backgroundColor: bgColor, borderColor },
          shadowStyle,
        ]}
        onPress={() => {
          if (answered) return;
          onSelect(index);
        }}
        disabled={!!answered}
        disabledOpacity={1}
      >
        <View style={[styles.badge, { backgroundColor: labelBg }]}>
          <Text style={[styles.badgeText, { color: labelColor }]}>{label}</Text>
        </View>

        <Text
          style={[styles.optionText, { color: textColor }]}
          numberOfLines={5}
        >
          {text}
        </Text>

        {isCorrect && (
          <Feather name="check-circle" size={20} color={iconColor} />
        )}
        {isWrong && <Feather name="x-circle" size={20} color={iconColor} />}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 12,
    position: "relative",
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    zIndex: 2,
  },
  badgeText: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
    zIndex: 2,
  },
});
