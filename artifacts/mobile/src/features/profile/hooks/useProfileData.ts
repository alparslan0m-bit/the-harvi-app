import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { mmkv } from "@/src/shared/storage/mmkv";
import { AvatarId } from "../components/DoctorAvatars";

/**
 * Hook to manage user profile data from MMKV.
 * Extracted from ProfileScreen logic.
 */
export function useProfileData() {
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [displayName, setDisplayName] = useState("");

  const loadProfile = useCallback(() => {
    const av = mmkv.getAvatar();
    setAvatarId(av ? (av as AvatarId) : null);
    setDisplayName(mmkv.getDisplayName());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  return { avatarId, displayName, refresh: loadProfile };
}