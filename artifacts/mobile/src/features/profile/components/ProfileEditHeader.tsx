import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/src/shared/hooks/useColors";
import { AnimatedPressable, BackButton } from "@/src/shared/components";

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
      <BackButton onPress={onCancel} size={18} />

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

  headerTitle: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
});
