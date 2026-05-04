import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarId } from "@/components/DoctorAvatars";
import { ProfileHeroCard } from "@/components/ProfileHeroCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useFeedback } from "@/hooks/useFeedback";
import { supabase } from "@/lib/supabase";
import { clearAllLectureCache } from "@/lib/questionCache";

const AVATAR_KEY = "harvi:avatar";
const NAME_KEY   = "harvi:displayName";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [displayName, setDisplayName] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0],
  });

  const initial = (user?.email?.[0] ?? "U").toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  // Reload avatar + name each time screen is focused (e.g. returning from edit)
  useFocusEffect(
    useCallback(() => {
      // Fade and slide in transition
      fadeAnim.setValue(0);
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      AsyncStorage.multiGet([AVATAR_KEY, NAME_KEY]).then((pairs) => {
        const av = pairs[0][1];
        const nm = pairs[1][1];
        if (av) setAvatarId(av as AvatarId);
        setDisplayName(nm ?? "");
      });
    }, [])
  );

  const {
    feedbackText, updateText,
    submitting, feedbackSent, feedbackError,
    cooldownSecs, isDisabled, isTooShort,
    handleSubmit,
  } = useFeedback(user?.id);

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "This will delete all your quiz results. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await supabase.from("quiz_results").delete().eq("user_id", user?.id ?? "");
          },
        },
      ]
    );
  };

  const handleClearDownloads = () => {
    Alert.alert(
      "Clear Downloads",
      "This will remove all offline-downloaded lectures. You will need to re-download them to take quizzes offline.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllLectureCache();
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/auth");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Fixed header ──────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 14, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}>
        {/* ── Scrollable content ────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* ── Hero card ─────────────────────────────────────────────── */}
        <ProfileHeroCard
          avatarId={avatarId}
          displayName={displayName}
          email={user?.email}
          memberSince={memberSince}
          initial={initial}
        />

        {/* ── Feedback ──────────────────────────────────────────────── */}
        <View style={styles.sectionLabel}>
          <Feather name="message-square" size={13} color={colors.mutedForeground} />
          <Text style={[styles.sectionLabelText, { color: colors.mutedForeground }]}>FEEDBACK</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textarea, {
              color: colors.foreground,
              borderColor: feedbackError ? "#fca5a5" : colors.border,
              backgroundColor: colors.background,
            }]}
            placeholder="Share your thoughts, report a bug, or suggest a feature…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            value={feedbackText}
            onChangeText={updateText}
            textAlignVertical="top"
            maxLength={500}
            editable={!isDisabled}
          />

          <Text style={[styles.charCount, {
            color: feedbackText.length >= 480
              ? "#dc2626"
              : feedbackText.length >= 400
              ? "#d97706"
              : colors.mutedForeground,
          }]}>
            {feedbackText.length} / 500
          </Text>

          {feedbackSent && (
            <View style={[styles.alertBox, { backgroundColor: "#d1fae5", borderColor: "#6ee7b7" }]}>
              <Feather name="check-circle" size={14} color="#059669" />
              <Text style={[styles.alertText, { color: "#059669" }]}>Feedback sent — thank you!</Text>
            </View>
          )}

          {feedbackError && (
            <View style={[styles.alertBox, { backgroundColor: "#fee2e2", borderColor: "#fca5a5" }]}>
              <Feather name="alert-circle" size={14} color="#dc2626" />
              <Text style={[styles.alertText, { color: "#dc2626", flex: 1 }]} numberOfLines={3}>
                {feedbackError}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, {
              backgroundColor: isDisabled || isTooShort ? colors.muted : colors.primary,
            }]}
            onPress={handleSubmit}
            disabled={isDisabled || isTooShort}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : cooldownSecs > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.submitBtnText, { color: colors.mutedForeground }]}>
                  Wait {cooldownSecs}s
                </Text>
              </View>
            ) : (
              <Text style={[styles.submitBtnText, {
                color: isTooShort ? colors.mutedForeground : "#fff",
              }]}>
                Submit Feedback
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Account ───────────────────────────────────────────────── */}
        <View style={styles.sectionLabel}>
          <Feather name="settings" size={13} color={colors.mutedForeground} />
          <Text style={[styles.sectionLabelText, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearHistory} activeOpacity={0.7}>
            <View style={[styles.actionIconWrap, { backgroundColor: "#fee2e2" }]}>
              <Feather name="trash-2" size={15} color="#ef4444" />
            </View>
            <Text style={[styles.actionLabel, { color: "#ef4444" }]}>Clear Quiz History</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.actionRow} onPress={handleClearDownloads} activeOpacity={0.7}>
            <View style={[styles.actionIconWrap, { backgroundColor: "#fff7ed" }]}>
              <Feather name="download-cloud" size={15} color="#f97316" />
            </View>
            <Text style={[styles.actionLabel, { color: "#f97316" }]}>Clear Downloaded Lectures</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.actionRow} onPress={handleSignOut} activeOpacity={0.7}>
            <View style={[styles.actionIconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="log-out" size={15} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Sign Out</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Harvi · v1.0.0</Text>
      </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 36, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },

  content: { paddingTop: 24, paddingHorizontal: 20 },

  sectionLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginLeft: 2 },
  sectionLabelText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },

  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 24, gap: 12 },

  textarea: {
    borderWidth: 1, borderRadius: 14, padding: 14,
    fontSize: 14, fontFamily: "Inter_400Regular",
    minHeight: 96, lineHeight: 22,
  },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4, marginBottom: 2 },

  alertBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  submitBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 2 },
  actionIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 2 },

  versionText: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -8, marginBottom: 4 },
});
