import * as Haptics from "expo-haptics";
import React from "react";
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

const PRESS_IN_DURATION = 120;
const PRESS_OUT_DURATION = 150;
const SCALE_ACTIVE = 0.96;
const OPACITY_ACTIVE = 0.85;

export type HapticFeedbackType = "none" | "light" | "medium" | "success" | "error";

export interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  feedback?: "scale" | "opacity" | "none";
  haptics?: HapticFeedbackType;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function AnimatedPressable({
  feedback = "opacity",
  haptics = "none",
  style,
  onPressIn,
  onPressOut,
  children,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  const isReducedMotion = useReducedMotion();

  // Determine actual feedback (if reduced motion, never use scale)
  const activeFeedback = isReducedMotion && feedback === "scale" ? "opacity" : feedback;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => {
    if (activeFeedback === "scale") {
      return {
        transform: [{ scale: scale.value }],
        opacity: disabled ? 0.5 : 1,
      };
    }
    if (activeFeedback === "opacity") {
      return {
        opacity: disabled ? 0.5 : opacity.value,
      };
    }
    return {
      opacity: disabled ? 0.5 : 1,
    };
  });

  const triggerHaptic = (type: HapticFeedbackType) => {
    if (Platform.OS === "web" || type === "none") return;

    const promise =
      type === "light"
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : type === "medium"
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : type === "success"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    void promise.catch((err) => {
      if (__DEV__) {
        console.warn("[AnimatedPressable] Haptics failed:", err);
      }
    });
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!disabled) {
      triggerHaptic(haptics);

      if (activeFeedback === "scale") {
        scale.value = withTiming(SCALE_ACTIVE, { duration: PRESS_IN_DURATION });
      } else if (activeFeedback === "opacity") {
        opacity.value = withTiming(OPACITY_ACTIVE, { duration: PRESS_IN_DURATION });
      }
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!disabled) {
      if (activeFeedback === "scale") {
        scale.value = withTiming(1, { duration: PRESS_OUT_DURATION });
      } else if (activeFeedback === "opacity") {
        opacity.value = withTiming(1, { duration: PRESS_OUT_DURATION });
      }
    }
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
