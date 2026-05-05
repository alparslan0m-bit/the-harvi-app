import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AvatarById, AvatarId } from "@/components/DoctorAvatars";
import { useColors } from "@/hooks/useColors";

interface Props {
  avatarId: AvatarId | null;
  displayName: string;
  email: string | undefined;
  memberSince: string | null;
  initial: string;
}

export function ProfileHeroCard({ avatarId, displayName, email, memberSince, initial }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatarRing, { borderColor: colors.primary + "40" }]}>
          {avatarId ? (
            <View style={[styles.avatarIllustration, { backgroundColor: colors.primary + "1A" }]}>
              <AvatarById id={avatarId} size={54} />
            </View>
          ) : (
            <View style={[styles.avatarInitial, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitialText}>{initial}</Text>
            </View>
          )}
        </View>
      </View>

      {/* User Info Stack */}
      <View style={styles.infoStack}>
        <Text
          style={[
            displayName ? styles.heroName : styles.heroNamePlaceholder,
            { color: displayName ? colors.foreground : colors.mutedForeground },
          ]}
          numberOfLines={1}
        >
          {displayName || "Add your name"}
        </Text>

        <Text style={[styles.heroEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
          {email}
        </Text>

        {memberSince && (
          <Text style={[styles.memberText, { color: colors.primary }]}>
            Joined {memberSince}
          </Text>
        )}
      </View>

      {/* Edit button */}
      <TouchableOpacity
        style={[styles.editBtn, { backgroundColor: colors.primary + "15" }]}
        onPress={() => router.push("/profile/edit")}
        activeOpacity={0.7}
      >
        <Feather name="edit-3" size={15} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  avatarWrap: { flexShrink: 0 },
  avatarRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIllustration: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialText: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  
  infoStack: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  heroName: { fontSize: 19, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.2 },
  heroNamePlaceholder: { fontSize: 15, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  heroEmail: { fontSize: 13, fontFamily: "Inter_400Regular", letterSpacing: -0.1 },
  memberText: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
});
