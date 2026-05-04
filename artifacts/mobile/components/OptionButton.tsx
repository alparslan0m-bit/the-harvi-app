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

import { useColors } from "@/hooks/useColors";
import { AnsweredState } from "@/types";

interface Props {
  text: string;
  index: number;
  answered: AnsweredState | null;
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
        withSpring(1.04, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 15 })
      );
    } else if (index === answered.selected && index !== answered.correct) {
      translateX.value = withSequence(
        withTiming(-9, { duration: 55 }),
        withTiming(9, { duration: 55 }),
        withTiming(-6, { duration: 55 }),
        withTiming(6, { duration: 55 }),
        withTiming(0, { duration: 55 })
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  const isCorrect = !!answered && index === answered.correct;
  const isWrong = !!answered && index === answered.selected && !isCorrect;
  const isDimmed = !!answered && !isCorrect && !isWrong;

  let bgColor = colors.card;
  let borderColor = colors.border;
  let textColor = colors.foreground;

  if (isCorrect)      { bgColor = "#dcfce7"; borderColor = "#4ade80"; textColor = "#14532d"; }
  else if (isWrong)   { bgColor = "#fee2e2"; borderColor = "#f87171"; textColor = "#7f1d1d"; }
  else if (isDimmed)  { bgColor = colors.muted; borderColor = "transparent"; textColor = colors.mutedForeground; }

  const label = String.fromCharCode(65 + index);

  const labelBg = isCorrect ? "#4ade80"
    : isWrong    ? "#f87171"
    : isDimmed   ? colors.border
    : colors.muted;

  const labelColor = isCorrect || isWrong ? "#fff" : textColor;

  return (
    <Animated.View entering={FadeInDown.delay(index * 65).duration(380).springify()}>
      <Animated.View style={animStyle}>
        <TouchableOpacity
          style={[styles.option, { backgroundColor: bgColor, borderColor }]}
          onPress={() => {
            if (answered) return;
            scale.value = withSequence(
              withSpring(0.97, { damping: 20 }),
              withSpring(1, { damping: 20 })
            );
            onSelect(index);
          }}
          activeOpacity={0.82}
          disabled={!!answered}
        >
          <View style={[styles.badge, { backgroundColor: labelBg }]}>
            <Text style={[styles.badgeText, { color: labelColor }]}>{label}</Text>
          </View>

          <Text style={[styles.optionText, { color: textColor }]} numberOfLines={5}>
            {text}
          </Text>

          {isCorrect && <Feather name="check-circle" size={20} color="#16a34a" />}
          {isWrong   && <Feather name="x-circle"     size={20} color="#dc2626" />}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 13,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 21 },
});
