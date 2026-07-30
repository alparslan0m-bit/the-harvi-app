import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";

import { AvatarById, AvatarId } from "./DoctorAvatars";
import { useColors } from "@/src/shared/hooks/useColors";

interface Props {
  avatarId: AvatarId | null;
  displayName: string;
  email: string | undefined;
  memberSince: string | null;
  initial: string;
}

export function ProfileHeroCard({
  avatarId,
  displayName,
  email,
  memberSince,
  initial,
}: Props) {
  const colors = useColors();

  // Pick a distinct pastel color for the Hero Card (e.g. Lavender/Periwinkle)
  const heroBg = colors.cardColors[4] || "#E3DBFA";
  const heroInk = "#1A1A1A"; // Candy Pastel high-contrast ink

  return (
    <View style={[styles.card, { backgroundColor: heroBg, elevation: 0, shadowOpacity: 0 }]}>
      <View style={styles.topSection}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View
            style={[
              styles.avatarRing,
              { backgroundColor: "rgba(255, 255, 255, 0.4)" }, // Soft contrast against pastel background
            ]}
          >
            {avatarId ? (
              <View style={[styles.avatarIllustration]}>
                <AvatarById id={avatarId} size={50} />
              </View>
            ) : (
              <View
                style={[
                  styles.avatarInitial,
                  { backgroundColor: colors.primary },
                ]}
              >
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
              {
                color: heroInk,
                opacity: displayName ? 1 : 0.6,
              },
            ]}
            numberOfLines={1}
          >
            {displayName || "Add your name"}
          </Text>

          <Text
            style={[styles.heroEmail, { color: heroInk, opacity: 0.7 }]}
            numberOfLines={1}
          >
            {email}
          </Text>
        </View>

        {/* Edit button */}
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: heroInk }]}
          onPress={() => router.push("/profile/edit")}
          activeOpacity={0.7}
        >
          <Feather name="edit-3" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {memberSince && (
        <View style={styles.footer}>
          <Feather name="calendar" size={12} color={heroInk} style={{ opacity: 0.7 }} />
          <Text style={[styles.memberText, { color: heroInk, opacity: 0.7 }]}>
            Joined at{" "}
            <Text
              style={{ color: heroInk, fontFamily: "Inter_600SemiBold", opacity: 1 }}
            >
              {memberSince}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28, // Candy Pastel 'lg' radius
    marginBottom: 24,
    overflow: "hidden",
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  avatarWrap: { flexShrink: 0 },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIllustration: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  infoStack: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  heroName: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  heroNamePlaceholder: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  heroEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  memberText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 999, // fully pill-shaped
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
});

