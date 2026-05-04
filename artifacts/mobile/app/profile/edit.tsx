import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPicker } from "@/components/AvatarPicker";
import { AvatarById, AvatarId } from "@/components/DoctorAvatars";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const AVATAR_KEY = "harvi:avatar";
const NAME_KEY = "harvi:displayName";

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  useEffect(() => {
    AsyncStorage.multiGet([AVATAR_KEY, NAME_KEY]).then((pairs) => {
      const av = pairs[0][1];
      const nm = pairs[1][1];
      if (av) setAvatarId(av as AvatarId);
      if (nm) setNameInput(nm);
    });
  }, []);

  const handleSelectAvatar = (id: AvatarId) => {
    setAvatarId(id);
    AsyncStorage.setItem(AVATAR_KEY, id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    await AsyncStorage.setItem(NAME_KEY, trimmed);
    if (avatarId) await AsyncStorage.setItem(AVATAR_KEY, avatarId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, {
        paddingTop: topPad + 12,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={[styles.headerBtnText, { color: "#fff" }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Avatar ───────────────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.8}
            style={styles.avatarWrap}
          >
            <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
              {avatarId ? (
                <View style={[styles.avatarInner, { backgroundColor: "#f0f9ff" }]}>
                  <AvatarById id={avatarId} size={90} />
                </View>
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarInitialText}>{initial}</Text>
                </View>
              )}
            </View>
            <View style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Feather name="smile" size={15} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
            Tap to change avatar
          </Text>
        </View>

        {/* ── Name field ───────────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DISPLAY NAME</Text>
          <View style={[styles.fieldBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="user" size={16} color={colors.mutedForeground} style={styles.fieldIcon} />
            <TextInput
              ref={nameRef}
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              maxLength={40}
              autoCapitalize="words"
            />
            {nameInput.length > 0 && (
              <TouchableOpacity onPress={() => setNameInput("")} activeOpacity={0.7}>
                <Feather name="x-circle" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Email field (read-only) ───────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EMAIL</Text>
          <View style={[styles.fieldBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="mail" size={16} color={colors.mutedForeground} style={styles.fieldIcon} />
            <Text style={[styles.fieldReadOnly, { color: colors.mutedForeground }]} numberOfLines={1}>
              {user?.email}
            </Text>
            <Feather name="lock" size={13} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.fieldNote, { color: colors.mutedForeground }]}>
            Email cannot be changed
          </Text>
        </View>

        {/* ── Save button ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Feather name="check" size={16} color="#fff" />
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>

      </ScrollView>

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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  headerBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 20, fontFamily: "Nunito_700Bold", letterSpacing: -0.3 },

  content: { paddingHorizontal: 24, paddingTop: 36 },

  avatarSection: { alignItems: "center", marginBottom: 40 },
  avatarWrap: { position: "relative" },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 106,
    height: 106,
    borderRadius: 53,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitialText: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#fff" },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 12 },

  fieldGroup: { marginBottom: 24 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  fieldIcon: { flexShrink: 0 },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    padding: 0,
  },
  fieldReadOnly: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  fieldNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    marginLeft: 2,
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
