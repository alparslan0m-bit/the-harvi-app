import React from "react";
import { View, Text, Alert, StyleSheet } from "react-native";

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncStore } from "@/src/shared/store/syncStore";
import { useColors } from "@/src/shared/hooks/useColors";
import { ZERO_STATS } from "@/src/features/stats/services/statsService";
import { supabase } from "@/src/shared/services/supabase";
import { clearAllLectureCache } from "@/src/features/quiz/services/questionCache";
import { clearAllUserCaches } from "@/src/shared/utils/cacheUtils";
import { AnimatedPressable } from "@/src/shared/components";

interface AccountActionsProps {
  userId?: string;
  onSignOut: () => Promise<void>;
}

/**
 * Component for account-related actions (Clear history, Clear downloads, Sign out).
 * Extracted from ProfileScreen.
 */
export function AccountActions({ userId, onSignOut }: AccountActionsProps) {
  const colors = useColors();

  const queryClient = useQueryClient();
  const isOnline = useSyncStore((s) => s.isOnline);
  const pendingCount = useSyncStore((s) => s.pendingCount);

  const handleClearHistory = () => {
    if (!isOnline) {
      Alert.alert("Offline", "You must be online to clear your history.");
      return;
    }

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

            const uid = userId ?? "";

            // 1. Delete remote data FIRST (so re-fetch cannot bring it back)
            try {
              const deletePromise = Promise.all([
                supabase.from("quiz_results").delete().eq("user_id", uid),
                supabase.from("user_stats").delete().eq("user_id", uid),
              ]);
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 10000),
              );
              await Promise.race([deletePromise, timeoutPromise]);
            } catch (error) {
              Alert.alert(
                "Network Error",
                "Could not reach the server to clear your history. Please check your connection and try again.",
              );
              return; // Stop execution so we don't desync local and remote state
            }

            // 2. Clear all local caches
            await clearAllUserCaches(uid);

            // 3. Zero out UI immediately, then re-fetch clean state
            queryClient.setQueriesData({ queryKey: ["stats"] }, ZERO_STATS);
            queryClient.setQueriesData({ queryKey: ["progress_sync"] }, new Set());
            queryClient.setQueriesData(
              { queryKey: ["lectureBestScores_sync"] },
              new Map(),
            );
            // Invalidate to ensure any active observers refetch cleanly in the background
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            queryClient.invalidateQueries({ queryKey: ["progress_sync"] });
            queryClient.invalidateQueries({ queryKey: ["lectureBestScores_sync"] });

            Alert.alert("History Cleared", "Your quiz history has been reset.");
          },
        },
      ],
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
            queryClient.setQueriesData({ queryKey: ["quiz"] }, undefined);
            queryClient.removeQueries({ queryKey: ["quiz"] });
            Alert.alert(
              "Downloads Cleared",
              "All offline lectures have been removed.",
            );
          },
        },
      ],
    );
  };

  const handleInternalSignOut = async () => {
    if (pendingCount > 0) {
      Alert.alert(
        "Un-synced Results",
        `You have ${pendingCount} offline quiz result${pendingCount === 1 ? "" : "s"} waiting to sync. Signing out now will permanently delete them.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Out Anyway",
            style: "destructive",
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await onSignOut();
              router.replace("/login" as Href);
            },
          },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onSignOut();
    router.replace("/login" as Href);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View
          style={[
            styles.headerIconWrap,
            { backgroundColor: colors.primary + "1A" },
          ]}
        >
          <Feather name="settings" size={14} color={colors.primary} />
        </View>
        <Text style={[styles.headerLabel, { color: colors.foreground }]}>
          Account
        </Text>
      </View>
      <ActionRow
        icon="trash-2"
        label="Clear Quiz History"
        onPress={handleClearHistory}
        color={colors.destructive}
        bgColor={colors.destructive + "1A"}
      />

      <ActionRow
        icon="download-cloud"
        label="Clear Downloaded Lectures"
        onPress={handleClearDownloads}
        color={colors.warning}
        bgColor={colors.warning + "1A"}
      />

      <ActionRow
        icon="log-out"
        label="Sign Out"
        onPress={handleInternalSignOut}
        color={colors.foreground}
        bgColor={colors.muted}
      />
    </View>
  );
}

interface ActionRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  bgColor: string;
}

function ActionRow({ icon, label, onPress, color, bgColor }: ActionRowProps) {
  const colors = useColors();
  return (
    <AnimatedPressable
      feedback="opacity"
      style={styles.actionRow}
      onPress={onPress}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28, // Candy Pastel 'lg' radius
    padding: 20,
    marginBottom: 24,
    gap: 4, // Increase gap between rows
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999, // Pill shape
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999, // Pill shape
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  // divider removed
});
