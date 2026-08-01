import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  feedback?: "scale" | "opacity" | "none";
  style?: StyleProp<ViewStyle> | any;
  children?: React.ReactNode;
}

export function AnimatedPressable({
  feedback = "opacity",
  style,
  onPressIn,
  onPressOut,
  children,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  const isActive = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => {
    if (feedback === "scale") {
      return {
        transform: [{ scale: withTiming(isActive.value ? 0.96 : 1, { duration: isActive.value ? 120 : 150 }) }],
      };
    }
    if (feedback === "opacity") {
      return {
        opacity: withTiming(isActive.value ? 0.7 : (disabled ? 0.5 : 1), { duration: isActive.value ? 120 : 150 }),
      };
    }
    return {
      opacity: disabled ? 0.5 : 1,
    };
  });

  const handlePressIn = (e: any) => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      isActive.value = 1;
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    isActive.value = 0;
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableBase
      style={[style, animStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  );
}
