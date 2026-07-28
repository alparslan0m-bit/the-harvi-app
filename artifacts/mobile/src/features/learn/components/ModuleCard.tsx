import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";
import { Module } from "@/src/shared/types";

interface Props {
  module: Module;
  index: number;
  onPress: () => void;
  hasAccess?: boolean;
  isFree?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ModuleCard({ module, index, onPress, hasAccess, isFree }: Props) {
  const scale = useSharedValue(1);
  const colors = useColors();
  const color = colors.cardColors[index % colors.cardColors.length] ?? colors.cardColors[0];

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[styles.card, animStyle, { backgroundColor: color }]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }}
      activeOpacity={0.9}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{module.name}</Text>
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 24,
    minHeight: 100,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: { zIndex: 2 },
  title: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
});
