import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { AvatarId } from "../components/DoctorAvatars";
import { mmkv } from "@/src/shared/storage/mmkv";

export function useProfileEdit() {
  // Synchronous MMKV reads — no hydration effect needed.
  const [avatarId, setAvatarId] = useState<AvatarId | null>(() => {
    const av = mmkv.getAvatar();
    return av ? (av as AvatarId) : null;
  });
  const [nameInput, setNameInput] = useState(() => mmkv.getDisplayName());
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleSelectAvatar = (id: AvatarId) => {
    setAvatarId(id);
    mmkv.setAvatar(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    const trimmed = nameInput.trim();
    mmkv.setDisplayName(trimmed);
    if (avatarId) mmkv.setAvatar(avatarId);
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