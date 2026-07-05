import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";
import { AnsweredState } from "@/src/shared/types";

interface Props {
  text: string;
  index: number;
  answered?: AnsweredState | null;
  onSelect: (i: number) => void;
}

export function OptionButton({ text, index, answered, onSelect }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  // Celebrate correct / shake wrong when answer is revealed
  useEffect(() => {
    if (!answered) return;
    if (index === answered.correct) {
      scale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 15 }),
      );
    } else if (index === answered.selected && index !== answered.correct) {
      translateX.value = withSequence(
        withTiming(-9, { duration: 55 }),
        withTiming(9, { duration: 55 }),
        withTiming(-6, { duration: 55 }),
        withTiming(6, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  const isCorrect = !!answered && index === answered.correct;
  const isWrong = !!answered && index === answered.selected && !isCorrect;
  const isDimmed = !!answered && !isCorrect && !isWrong;

  let bgColor: string = colors.card;
  let borderColor: string = colors.border;
  let textColor: string = colors.foreground;

  if (isCorrect) {
    bgColor = colors.success + "12";
    borderColor = colors.success + "66";
  } else if (isWrong) {
    bgColor = colors.destructive + "12";
    borderColor = colors.destructive + "66";
  } else if (isDimmed) {
    bgColor = colors.muted + "40";
    borderColor = "transparent";
    textColor = colors.mutedForeground;
  }

  const label = String.fromCharCode(65 + index);

  const labelBg = isCorrect
    ? colors.success
    : isWrong
      ? colors.destructive
      : isDimmed
        ? colors.border
        : colors.muted;

  const labelColor = isCorrect || isWrong ? "#fff" : textColor;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 65)
        .duration(380)
        .springify()}
    >
      <Animated.View style={animStyle}>
        <TouchableOpacity
          style={[styles.option, { backgroundColor: bgColor, borderColor }]}
          onPress={() => {
            if (answered) return;
            scale.value = withSequence(
              withSpring(0.96, { damping: 20 }),
              withSpring(1, { damping: 20 }),
            );
            onSelect(index);
          }}
          activeOpacity={0.88}
          disabled={!!answered}
        >
          <View
            style={[
              styles.innerGlow,
              {
                borderColor: isCorrect
                  ? colors.success + "33"
                  : isWrong
                    ? colors.destructive + "33"
                    : "rgba(255,255,255,0.1)",
              },
            ]}
          />

          <View style={[styles.badge, { backgroundColor: labelBg }]}>
            <Text style={[styles.badgeText, { color: labelColor }]}>
              {label}
            </Text>
          </View>

          <Text
            style={[styles.optionText, { color: textColor }]}
            numberOfLines={5}
          >
            {text}
          </Text>

          {isCorrect && (
            <Feather name="check-circle" size={20} color={colors.success} />
          )}
          {isWrong && (
            <Feather name="x-circle" size={20} color={colors.destructive} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 14,
    overflow: "hidden",
    position: "relative",
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1.5,
    zIndex: 1,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 12,
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
