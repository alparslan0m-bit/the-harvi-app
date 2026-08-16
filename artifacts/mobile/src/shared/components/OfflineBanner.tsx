/**
 * @file OfflineBanner.tsx
 * @description Floating status banner component that slides down from top of screen to visually report device offline state,
 * active quiz synchronization progress, or queued pending sync counts.
 */
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";
import { THEME } from "@/src/shared/constants/theme";
import { useSyncStore } from "@/src/shared/store/syncStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Interface defining the properties for the network status banner display.
 */
interface Props {
  /** Whether the device currently has active network/internet reachability */
  isOnline: boolean;
  /** Number of offline quiz results currently queued in AsyncStorage waiting to sync */
  pendingCount: number;
  /** Whether the sync engine is actively uploading queued items to Supabase */
  isSyncing: boolean;
}

/**
 * Renders an animated floating indicator displaying offline status, queued count, or sync progress.
 * 
 * @param props - Component props
 * @returns Reanimated top status banner
 */
export function OfflineBanner({ isOnline, pendingCount, isSyncing }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 16) + 8;
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

  const bg = !isOnline
    ? colors.warning
    : isSyncing
      ? colors.primary
      : colors.success;
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
    <Animated.View
      style={[
        styles.banner,
        {
          top: topInset,
          backgroundColor: colors.card,
          borderColor: bg + "33",
        },
        animStyle,
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: bg }]} />
      <Feather name={icon} size={11} color={bg} />
      <Text style={[styles.text, { color: colors.foreground }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: THEME.radius,
    borderWidth: 1.5,
    gap: 8,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
});

/**
 * Self-contained wrapper component that automatically connects the `OfflineBanner` UI 
 * to global network status state from `useSyncStore`. Mount in the root layout.
 */
export function GlobalOfflineBanner() {
  const isOnline = useSyncStore((s) => s.isOnline);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  return (
    <OfflineBanner
      isOnline={isOnline}
      pendingCount={pendingCount}
      isSyncing={isSyncing}
    />
  );
}
