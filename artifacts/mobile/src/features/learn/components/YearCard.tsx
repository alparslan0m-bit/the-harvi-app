import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";
import { THEME } from "@/src/shared/constants/theme";
import { Year } from "@/src/shared/types";
import { AnimatedPressable } from "@/src/shared/components";

interface Props {
  year: Year;
  index: number;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function YearCard({ year, index, onPress }: Props) {
  const scale = useSharedValue(1);
  const colors = useColors();
  const color = colors.cardColors[index % colors.cardColors.length];

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[styles.card, animStyle, { backgroundColor: color }]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.96, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.cardForeground }]}>
          {year.name}
        </Text>
      </View>
    </AnimatedTouchable>
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
