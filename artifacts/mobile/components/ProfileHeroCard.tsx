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
      {/* Edit button */}
      <TouchableOpacity
        style={[styles.editToggle, { backgroundColor: colors.muted }]}
        onPress={() => router.push("/profile/edit")}
        activeOpacity={0.8}
      >
        <Feather name="edit-2" size={12} color={colors.mutedForeground} />
        <Text style={[styles.editToggleText, { color: colors.mutedForeground }]}>Edit</Text>
      </TouchableOpacity>

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatarRing, { borderColor: colors.primary + "40" }]}>
          {avatarId ? (
            <View style={[styles.avatarIllustration, { backgroundColor: "#f0f9ff" }]}>
              <AvatarById id={avatarId} size={60} />
            </View>
          ) : (
            <View style={[styles.avatarInitial, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitialText}>{initial}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Name */}
      <Text
        style={[
          displayName ? styles.heroName : styles.heroNamePlaceholder,
          { color: displayName ? colors.foreground : colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {displayName || "Add your name"}
      </Text>

      {/* Email */}
      <Text style={[styles.heroEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
        {email}
      </Text>

      {/* Member since pill */}
      {memberSince && (
        <View style={[styles.memberPill, { backgroundColor: colors.primary + "12" }]}>
          <Feather name="calendar" size={11} color={colors.primary} />
          <Text style={[styles.memberPillText, { color: colors.primary }]}>
            Member since {memberSince}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 18,
    marginBottom: 20,
    gap: 3,
  },
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 2,
  },
  editToggleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIllustration: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialText: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#fff" },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  heroNamePlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic", marginTop: 2 },
  heroEmail: { fontSize: 13, fontFamily: "Inter_400Regular", letterSpacing: -0.1, marginTop: 2 },
  memberPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  memberPillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
