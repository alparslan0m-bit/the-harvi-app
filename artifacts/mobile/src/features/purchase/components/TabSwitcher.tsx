// Extracted from PurchaseScreen.tsx — Animated tab switcher (buy / code)
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { ThemeColors } from "@/src/shared/hooks/useColors";
import { SPRING_CONFIG } from "./purchase.constants";

export type Tab = "buy" | "code";

export const TabSwitcher = React.memo(function TabSwitcher({
  tab,
  onTabChange,
  colors,
}: {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  colors: ThemeColors;
}) {
  const [tabWidth, setTabWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = (e.nativeEvent.layout.width - 8) / 2; // minus padding
      setTabWidth(w);
      indicatorX.value = tab === "buy" ? 0 : w;
    },
    [tab, indicatorX],
  );

  useEffect(() => {
    indicatorX.value = withSpring(tab === "buy" ? 0 : tabWidth, SPRING_CONFIG);
  }, [tab, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <View
        style={[styles.tabRow, { backgroundColor: colors.muted }]}
        onLayout={handleLayout}
      >
        {/* Sliding indicator */}
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.tabIndicator,
              { backgroundColor: colors.background },
              indicatorStyle,
            ]}
          />
        )}

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange("buy")}
          activeOpacity={0.7}
        >
          <Feather
            name="shopping-bag"
            size={16}
            color={tab === "buy" ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: tab === "buy" ? colors.primary : colors.mutedForeground },
            ]}
          >
            Buy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange("code")}
          activeOpacity={0.7}
        >
          <Feather
            name="key"
            size={16}
            color={tab === "code" ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: tab === "code" ? colors.primary : colors.mutedForeground },
            ]}
          >
            Access Code
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    width: "100%",
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    height: "100%",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
