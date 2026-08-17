import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { useMMKVString } from "react-native-mmkv";
import { AvatarId } from "../components/DoctorAvatars";
import { storage } from "@/src/shared/storage/mmkv";

export function useProfileEdit() {
  // Synchronous MMKV reads — no hydration effect needed.
  const [avatarIdValue, setAvatarIdValue] = useMMKVString("avatar", storage);
  const [displayNameValue, setDisplayNameValue] = useMMKVString("displayName", storage);

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