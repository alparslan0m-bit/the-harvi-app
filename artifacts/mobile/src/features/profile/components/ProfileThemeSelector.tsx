import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useTheme } from "@/src/shared/store/themeStore";
import { useColors } from "@/src/shared/hooks/useColors";

export function ProfileThemeSelector() {
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);
  const colors = useColors();

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>APPEARANCE</Text>
      <View style={styles.themeRow}>
        {([
          { id: "harvi", label: "Harvi", icon: "activity" },
          { id: "pink", label: "Pink", icon: "heart" },
          { id: "mint", label: "Mint", icon: "feather" },
          { id: "ocean", label: "Ocean", icon: "droplet" },
        ] as const).map((item) => {
          const active = theme === item.id;
          const accent = item.id === "pink" ? "#db2777" : item.id === "mint" ? "#10b981" : item.id === "ocean" ? "#0ea5e9" : colors.primary;
          
          let bg = colors.primary + "1A";
          if (item.id === "pink") bg = "#db27771A";
          if (item.id === "mint") bg = "#10b9811A";
          if (item.id === "ocean") bg = "#0ea5e91A";

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.themeBtn,
                { 
                  backgroundColor: active ? bg : colors.muted,
                }
              ]}
              onPress={() => {
                setTheme(item.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              activeOpacity={0.75}
            >
              <Feather 
                name={item.icon} 
                size={16} 
                color={active ? accent : colors.mutedForeground} 
              />
              <Text style={[
                styles.themeBtnText, 
                { color: active ? accent : colors.mutedForeground }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { marginBottom: 24 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  themeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999, // Pill shape
  },
  themeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
