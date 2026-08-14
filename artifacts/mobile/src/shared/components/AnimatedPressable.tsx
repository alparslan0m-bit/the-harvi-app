/**
 * @file AnimatedPressable.tsx
 * @description A touch-interactive pressable primitive built on Reanimated 3 and Expo Haptics.
 * Transparently respects system `useReducedMotion()` settings, automatically falling back from scale 
 * transforms to subtle opacity shifts to satisfy accessibility guidelines.
 */
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

/** Supported haptic feedback vibration patterns */
export type HapticFeedbackType =
  | "none"
  | "light"
  | "medium"
  | "success"
  | "error";

/** Props for the AnimatedPressable component */
export interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  /** Visual feedback mode on touch down ("scale" compression, "opacity" dim, or "none") */
  feedback?: "scale" | "opacity" | "none";
  /** Haptic feedback pattern triggered on press in */
  haptics?: HapticFeedbackType;
  /** Component style */
  style?: StyleProp<ViewStyle>;
  /** Inner element content */
  children?: React.ReactNode;
  /** Target opacity when `disabled` is true (defaults to 0.5) */
  disabledOpacity?: number;
}

/**
 * Enhanced pressable component providing spring micro-interactions, haptics, and accessibility fallbacks.
 * 
 * @param props - AnimatedPressableProps
 * @returns Reanimated pressable component
 */
export function AnimatedPressable({
  feedback = "opacity",
  haptics = "none",
  style,
  onPressIn,
  onPressOut,
  children,
  disabled,
  disabledOpacity = 0.5,
  ...rest
}: AnimatedPressableProps) {
  const isReducedMotion = useReducedMotion();

  // Determine actual feedback (if reduced motion, never use scale)
  const activeFeedback =
    isReducedMotion && feedback === "scale" ? "opacity" : feedback;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => {
    if (activeFeedback === "scale") {
      return {
        transform: [{ scale: scale.value }],
        opacity: disabled ? disabledOpacity : 1,
      };
    }
    if (activeFeedback === "opacity") {
      return {
        opacity: disabled ? disabledOpacity : opacity.value,
      };
    }
    return {
      opacity: disabled ? disabledOpacity : 1,
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
            ? Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              )
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
        opacity.value = withTiming(OPACITY_ACTIVE, {
          duration: PRESS_IN_DURATION,
        });
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
