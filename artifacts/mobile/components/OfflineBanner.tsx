import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface Props {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
}

export function OfflineBanner({ isOnline, pendingCount, isSyncing }: Props) {
  const colors = useColors();
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  const shouldShow = !isOnline || isSyncing || pendingCount > 0;

  useEffect(() => {
    if (shouldShow) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(-60, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [shouldShow]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const bg = !isOnline ? colors.warning : isSyncing ? colors.primary : colors.success;
  const icon: React.ComponentProps<typeof Feather>["name"] = !isOnline
    ? "wifi-off"
    : isSyncing
    ? "refresh-cw"
    : "check-circle";

  const label = !isOnline
    ? pendingCount > 0
      ? `Offline · ${pendingCount} result${pendingCount !== 1 ? "s" : ""} queued`
      : "You're offline"
    : isSyncing
    ? "Syncing results…"
    : pendingCount > 0
    ? `Synced ${pendingCount} result${pendingCount !== 1 ? "s" : ""}`
    : "";

  return (
    <Animated.View style={[styles.banner, { backgroundColor: bg }, animStyle]}>
      <View style={styles.inner}>
        <Feather name={icon} size={13} color="#fff" />
        <Text style={styles.text}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: 0.1,
  },
});
