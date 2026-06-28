import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { TabIcon } from "@/components";

/**
 * Standard tab layout for Web, Android, and older iOS versions.
 */
function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1.5,
          borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.03)",
          elevation: 0,
          shadowColor: "transparent",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          paddingBottom: isWeb ? 0 : Math.max(insets.bottom - 6, 4),
          ...(isWeb ? { height: 90 } : { height: 55 + Math.max(insets.bottom - 6, 4) }),
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_700Bold",
          fontSize: 11,
          marginTop: 0,
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="(learn)"
        options={{
          title: "Learn",
          tabBarIcon: ({ color }) => (
            <TabIcon name="book-open" sfName="books.vertical" color={color} size={30} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color }) => (
            <TabIcon name="bar-chart-2" sfName="chart.bar" color={color} size={30} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <TabIcon name="user" sfName="person.circle" color={color} size={30} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <ClassicTabLayout />
    </View>
  );
}
