import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { clearStatsCache } from "@/hooks/useStats";
import { clearProgressCache } from "@/hooks/useProgress";
import { supabase } from "@/lib/supabase";
import { clearAllLectureCache } from "@/lib/questionCache";
import { clearQueueForUser } from "@/lib/offlineQueue";

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
            
            const uid = userId ?? "";
            
            // 1. Clear everything locally immediately
            await Promise.all([
              clearStatsCache(uid),
              clearProgressCache(uid),
              clearQueueForUser(uid),
            ]);

            // 2. Clear remote (will try but might fail if offline)
            try {
              await supabase.from("quiz_results").delete().eq("user_id", uid);
            } catch (error) {
              console.warn("[handleClearHistory] Remote delete failed (possibly offline):", error);
            }

            // 3. Force refresh UI
            queryClient.invalidateQueries({ queryKey: ["stats", uid] });
            queryClient.invalidateQueries({ queryKey: ["progress", uid] });
            
            Alert.alert("History Cleared", "Your quiz history has been reset.");
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

  const handleInternalSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onSignOut();
    router.replace("/auth");
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ActionRow
        icon="trash-2"
        label="Clear Quiz History"
        onPress={handleClearHistory}
        color="#ef4444"
        bgColor="#fee2e2"
      />
      
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <ActionRow
        icon="download-cloud"
        label="Clear Downloaded Lectures"
        onPress={handleClearDownloads}
        color="#f97316"
        bgColor="#fff7ed"
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIconWrap, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 24, gap: 0 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 2 },
  actionIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 2 },
});
