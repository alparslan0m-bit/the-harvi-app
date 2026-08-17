import { useMMKVString } from "react-native-mmkv";
import {
  storage,
  profileAvatarKey,
  profileDisplayNameKey,
} from "@/src/shared/storage/mmkv";
import { useAuth } from "@/src/shared/store/authStore";
import { AvatarId } from "../components/DoctorAvatars";

/**
 * Hook to manage user profile data reactively from MMKV.
 * Keys are scoped per user (audit P1-5) so a shared device never leaks
 * one account's profile to the next.
 */
export function useProfileData() {
  const userId = useAuth((s) => s.user?.id);
  const avatarKey = userId ? profileAvatarKey(userId) : "__no_user__";
  const displayNameKey = userId ? profileDisplayNameKey(userId) : "__no_user__";
  const [avatarIdValue] = useMMKVString(avatarKey, storage);
  const [displayNameValue] = useMMKVString(displayNameKey, storage);

  const avatarId = avatarIdValue ? (avatarIdValue as AvatarId) : null;
  const displayName = displayNameValue || "";

  return { avatarId, displayName, refresh: () => {} };
}