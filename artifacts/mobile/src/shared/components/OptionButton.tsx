import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
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
    opacity: withTiming(isDimmed ? 0.45 : 1, { duration: 300 }),
  }));

  // Celebrate correct / shake wrong when answer is revealed
  useEffect(() => {
    if (!answered) return;
    if (index === answered.correct) {
      scale.value = withSequence(
        withTiming(1.03, { duration: 150 }),
        withTiming(1, { duration: 150 }),
      );
    } else if (index === answered.selected && index !== answered.correct) {
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
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(200)}
    >
      <Animated.View style={animStyle}>
        <TouchableOpacity
          style={[styles.option, { backgroundColor: bgColor, borderColor }, shadowStyle]}
          onPressIn={() => {
            if (answered) return;
            scale.value = withTiming(0.96, { duration: 120 });
          }}
          onPressOut={() => {
            if (answered) return;
            scale.value = withTiming(1, { duration: 150 });
          }}
          onPress={() => {
            if (answered) return;
            onSelect(index);
          }}
          activeOpacity={0.88}
          disabled={!!answered}
        >
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
            <Feather name="check-circle" size={20} color={iconColor} />
          )}
          {isWrong && (
            <Feather name="x-circle" size={20} color={iconColor} />
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
