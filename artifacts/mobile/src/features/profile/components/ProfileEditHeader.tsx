import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useColors } from "@/src/shared/hooks/useColors";
import { AnimatedPressable } from "@/src/shared/components";

export function ProfileEditHeader({
  topPad,
  onSave,
  onCancel,
}: {
  topPad: number;
  onSave: () => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  return (
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 14,
            backgroundColor: colors.background,
          },
        ]}
      >
      <AnimatedPressable feedback="opacity"
        style={[styles.backBtn, { backgroundColor: "white" }]}
        onPress={onCancel}
        
      >
        <Feather name="arrow-left" size={18} color={colors.foreground} />
      </AnimatedPressable>

      <Text style={[styles.headerTitle, { color: colors.foreground }]}>
        Edit Profile
      </Text>

      <AnimatedPressable feedback="opacity"
        style={[styles.headerBtn, { backgroundColor: colors.primary }]}
        onPress={onSave}
        
      >
        <Text style={[styles.headerBtnText, { color: "#fff" }]}>Save</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999, // Pill shape
  },
  headerBtnText: { fontSize: 14, fontFamily: "Nunito_800ExtraBold" },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999, // Perfectly circular
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
});
