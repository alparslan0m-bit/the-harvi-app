import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPicker } from "./AvatarPicker";
import { ProfileEditHeader } from "./ProfileEditHeader";
import { ProfileAvatarSection } from "./ProfileAvatarSection";
import { ProfileEditField } from "./ProfileEditField";
import { ProfileThemeSelector } from "./ProfileThemeSelector";

import { useAuth } from "@/src/shared/store/authStore";
import { useColors } from "@/src/shared/hooks/useColors";
import { useProfileEdit } from "@/src/features/profile/hooks/useProfileEdit";
import { THEME } from "@/src/shared/constants/theme";
import { AnimatedPressable } from "@/src/shared/components";

/**
 * EditProfileScreen - Refactored for modularity.
 * Handles user profile updates, including name, avatar, and theme selection.
 */
export function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  
  // Custom hook for state and persistence logic
  const {
    avatarId,
    nameInput,
    setNameInput,
    pickerVisible,
    setPickerVisible,
    handleSelectAvatar,
    handleSave,
    handleCancel,
  } = useProfileEdit();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <ProfileEditHeader 
        topPad={topPad} 
        onSave={handleSave} 
        onCancel={handleCancel} 
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar Section ── */}
        <ProfileAvatarSection 
          avatarId={avatarId} 
          initial={initial} 
          onPress={() => setPickerVisible(true)} 
        />

        {/* ── Name Field ── */}
        <ProfileEditField 
          label="DISPLAY NAME"
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Your name"
          icon="user"
          onClear={() => setNameInput("")}
          onSubmitEditing={handleSave}
        />

        {/* ── Email Field (Read-only) ── */}
        <ProfileEditField 
          label="EMAIL"
          value={user?.email ?? ""}
          icon="mail"
          readOnly
          note="Primary account email (secured)"
        />
        
        {/* ── Appearance Section ── */}
        <ProfileThemeSelector />

        {/* ── Primary Save Button ── */}
        <AnimatedPressable feedback="opacity"
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          
        >
          <Feather name="check" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </AnimatedPressable>

      </ScrollView>

      {/* ── Modals ── */}
      <AvatarPicker
        visible={pickerVisible}
        current={avatarId}
        onSelect={handleSelectAvatar}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 26 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: THEME.radius,
    marginTop: 6,
  },
  saveBtnText: { fontSize: 17, fontFamily: "Nunito_800ExtraBold", color: "#fff" },
});
