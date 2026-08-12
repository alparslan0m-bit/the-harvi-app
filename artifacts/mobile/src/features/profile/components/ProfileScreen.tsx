import { useScrollToTop } from "@react-navigation/native";
import React, { useRef } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedbackForm } from "@/src/shared/components";
import { ProfileHeroCard } from "./ProfileHeroCard";
import { AccountActions } from "./AccountActions";
import { useAuth } from "@/src/shared/store/authStore";
import { useColors } from "@/src/shared/hooks/useColors";
import { useProfileData } from "@/src/features/profile/hooks/useProfileData";

import { useScreenAnimation } from "@/src/shared/hooks/useScreenAnimation";

/**
 * ProfileScreen - Refactored to be thin and readable.
 * Follows Phase 7 of the Senior Refactor Skill.
 */
export function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { avatarId, displayName } = useProfileData();

  const scrollRef = useRef<any>(null);
  useScrollToTop(scrollRef);

  // Reusable screen transition animation
  const { fadeAnim, translateY } = useScreenAnimation(scrollRef);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const initial = (user?.email?.[0] ?? "U").toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* --- Fixed Header --- */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            backgroundColor: colors.headerBackground,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.headerForeground }]}>
          Profile
        </Text>
      </View>

      <Animated.View
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
        >
          {/* --- Hero Section --- */}
          <ProfileHeroCard
            avatarId={avatarId}
            displayName={displayName}
            email={user?.email}
            memberSince={memberSince}
            initial={initial}
          />

          {/* --- Feedback Section --- */}
          <FeedbackForm userId={user?.id ?? ""} />

          <AccountActions userId={user?.id ?? ""} onSignOut={signOut} />

          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
            Harvi · v1.0.0
          </Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 24, // Candy Pastel spacing
    paddingBottom: 16,
    // border removed
  },
  title: {
    fontSize: 38,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  content: { paddingTop: 16, paddingHorizontal: 24 }, // spacing multiple of 4
  versionText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 12,
    marginBottom: 12,
  },
});
