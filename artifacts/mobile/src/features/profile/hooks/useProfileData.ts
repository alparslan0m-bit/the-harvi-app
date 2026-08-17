import { useMMKVString } from "react-native-mmkv";
import { storage } from "@/src/shared/storage/mmkv";
import { AvatarId } from "../components/DoctorAvatars";

/**
 * Hook to manage user profile data reactively from MMKV.
 */
export function useProfileData() {
  const [avatarIdValue] = useMMKVString("avatar", storage);
  const [displayNameValue] = useMMKVString("displayName", storage);

  const avatarId = avatarIdValue ? (avatarIdValue as AvatarId) : null;
  const displayName = displayNameValue || "";

  return { avatarId, displayName, refresh: () => {} };
}