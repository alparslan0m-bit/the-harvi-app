import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { useMMKVString } from "react-native-mmkv";
import { AvatarId } from "../components/DoctorAvatars";
import {
  storage,
  profileAvatarKey,
  profileDisplayNameKey,
} from "@/src/shared/storage/mmkv";
import { useAuth } from "@/src/shared/store/authStore";

export function useProfileEdit() {
  const userId = useAuth((s) => s.user?.id);
  const avatarKey = userId ? profileAvatarKey(userId) : "__no_user__";
  const displayNameKey = userId ? profileDisplayNameKey(userId) : "__no_user__";

  // Synchronous MMKV reads — no hydration effect needed. Keys are per-user
  // (audit P1-5) so profile edits never bleed across accounts.
  const [avatarIdValue, setAvatarIdValue] = useMMKVString(avatarKey, storage);
  const [displayNameValue, setDisplayNameValue] = useMMKVString(
    displayNameKey,
    storage,
  );

  const [avatarId, setAvatarId] = useState<AvatarId | null>(() => {
    return avatarIdValue ? (avatarIdValue as AvatarId) : null;
  });
  const [nameInput, setNameInput] = useState(() => displayNameValue || "");
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleSelectAvatar = (id: AvatarId) => {
    setAvatarId(id);
    setAvatarIdValue(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    const trimmed = nameInput.trim();
    setDisplayNameValue(trimmed);
    if (avatarId) setAvatarIdValue(avatarId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return {
    avatarId,
    nameInput,
    setNameInput,
    pickerVisible,
    setPickerVisible,
    handleSelectAvatar,
    handleSave,
    handleCancel,
  };
}