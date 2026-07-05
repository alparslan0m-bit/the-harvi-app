import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/src/shared/hooks/useColors";

export function ProfileEditHeader({ 
  topPad, 
  onSave, 
  onCancel 
}: { topPad: number; onSave: () => void; onCancel: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.header, {
      paddingTop: topPad + 14,
      borderBottomColor: "transparent",
      backgroundColor: colors.background,
    }]}>
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.muted }]}
        onPress={onCancel}
        activeOpacity={0.75}
      >
        <Feather name="arrow-left" size={18} color={colors.foreground} />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>

      <TouchableOpacity
        style={[styles.headerBtn, { backgroundColor: colors.primary }]}
        onPress={onSave}
        activeOpacity={0.88}
      >
        <Text style={[styles.headerBtnText, { color: "#fff" }]}>Save</Text>
      </TouchableOpacity>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  headerBtnText: { fontSize: 14, fontFamily: "Nunito_800ExtraBold" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },
});
