import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AvatarId } from "../components/DoctorAvatars";

const AVATAR_KEY = "harvi:avatar";
const NAME_KEY = "harvi:displayName";

export function useProfileEdit() {
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);

  // Load initial data
  useEffect(() => {
    AsyncStorage.multiGet([AVATAR_KEY, NAME_KEY]).then((pairs) => {
      const av = pairs[0]?.[1];
      const nm = pairs[1]?.[1];
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
