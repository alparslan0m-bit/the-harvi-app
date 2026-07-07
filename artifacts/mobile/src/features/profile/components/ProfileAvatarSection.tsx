import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { AvatarById, AvatarId } from "./DoctorAvatars";
import { useColors } from "@/src/shared/hooks/useColors";

export function ProfileAvatarSection({ 
  avatarId, 
  initial, 
  onPress 
}: { avatarId: AvatarId | null; initial: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.avatarSection}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.avatarWrap}
      >
        <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
          {avatarId ? (
            <View style={[styles.avatarInner, { backgroundColor: colors.primary + "1A" }]}>
              <AvatarById id={avatarId} size={86} />
            </View>
          ) : (
            <View style={[styles.avatarInner, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitialText}>{initial}</Text>
            </View>
          )}
        </View>
        <View style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
          <Feather name="camera" size={14} color="#fff" />
        </View>
      </TouchableOpacity>
      <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
        Tap to change medical avatar
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatarWrap: { position: "relative" },
  avatarRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitialText: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#fff" },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 12 },
});
