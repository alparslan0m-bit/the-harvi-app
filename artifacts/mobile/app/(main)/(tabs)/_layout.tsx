import { Tabs } from "expo-router";
import React from "react";
import { Platform, View, useColorScheme, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/src/shared/hooks/useColors";
import { TabIcon } from "@/src/shared/components";

function CustomTabBar({
  state,
  descriptors,
  navigation,
  insets,
  colors,
  isDark,
  isWeb,
}: any) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: isWeb ? 24 : Math.max(insets.bottom, 24),
        left: 24,
        right: 24,
        height: 68,
        backgroundColor: isDark ? "#121212" : "#1A1A1A",
        borderRadius: 999,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        paddingHorizontal: 8,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            {options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? "#FFFFFF" : "rgba(255,255,255,0.4)",
              size: 24,
            })}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Standard tab layout for Web, Android, and older iOS versions.
 */
function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();

  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          insets={insets}
          colors={colors}
          isDark={isDark}
          isWeb={isWeb}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(learn)"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                overflow: "hidden",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: focused ? colors.accent : "transparent",
              }}
            >
              <TabIcon
                name="book-open"
                sfName="books.vertical"
                color={color}
                size={24}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                overflow: "hidden",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: focused ? colors.accent : "transparent",
              }}
            >
              <TabIcon
                name="bar-chart-2"
                sfName="chart.bar"
                color={color}
                size={24}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                overflow: "hidden",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: focused ? colors.accent : "transparent",
              }}
            >
              <TabIcon
                name="user"
                sfName="person.circle"
                color={color}
                size={24}
              />
            </View>
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
