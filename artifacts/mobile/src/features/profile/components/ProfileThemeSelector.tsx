import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/src/shared/store/themeStore";
import { useColors } from "@/src/shared/hooks/useColors";

export function ProfileThemeSelector() {
  const { theme, setTheme } = useTheme();
  const colors = useColors();

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>APPEARANCE</Text>
      <View style={styles.themeRow}>
        {([
          { id: "harvi", label: "Harvi", icon: "activity" },
          { id: "dark", label: "Dark", icon: "moon" },
          { id: "pink", label: "Pink", icon: "heart" },
        ] as const).map((item) => {
          const active = theme === item.id;
          const accent = item.id === "pink" ? "#db2777" : colors.primary;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.themeBtn,
                { 
                  backgroundColor: active ? (item.id === "pink" ? "#db27771A" : colors.primary + "1A") : colors.card,
                  borderColor: active ? accent : colors.border,
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
    borderRadius: 16,
    borderWidth: 1.5,
  },
  themeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
