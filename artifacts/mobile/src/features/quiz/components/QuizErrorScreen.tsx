import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/src/shared/hooks/useColors";

interface QuizErrorScreenProps {
  error: Error | null;
  lectureId: string;
}

export function QuizErrorScreen({ error, lectureId }: QuizErrorScreenProps) {
  const colors = useColors();
  const isOfflineError = !!error?.message?.includes("offline");

  return (
    <View
      style={[
        styles.centerScreen,
        { backgroundColor: colors.background, paddingHorizontal: 28 },
      ]}
    >
      <View
        style={[
          styles.errorIcon,
          {
            backgroundColor: isOfflineError
              ? colors.warning + "1A"
              : colors.destructive + "1A",
          },
        ]}
      >
        <Feather
          name={isOfflineError ? "wifi-off" : "alert-circle"}
          size={32}
          color={isOfflineError ? colors.warning : colors.destructive}
        />
      </View>
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>
        {isOfflineError
          ? "Not downloaded"
          : error
            ? "Failed to load"
            : "No questions"}
      </Text>
      <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
        {isOfflineError
          ? `Go back to the subject and tap "Download offline" while connected to the internet.`
          : error
            ? error.message
            : `No questions are linked to this lecture.\n\nLecture ID: ${lectureId}`}
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.errorBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.errorBtnText}>Go back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  errorIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  errorBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  errorBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  errorBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
