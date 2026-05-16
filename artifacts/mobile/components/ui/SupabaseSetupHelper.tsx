import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface SupabaseSetupHelperProps {
  showSetup: boolean;
  onToggle: () => void;
}

export function SupabaseSetupHelper({ showSetup, onToggle }: SupabaseSetupHelperProps) {
  const colors = useColors();
  const redirectUrl = Linking.createURL("/auth/callback");

  return (
    <>
      <TouchableOpacity
        style={[
          styles.setupToggle,
          {
            backgroundColor: showSetup ? colors.primary + "1A" : colors.muted,
            borderColor: showSetup ? colors.primary + "33" : colors.border,
          },
        ]}
        onPress={onToggle}
      >
        <Feather
          name={showSetup ? "chevron-up" : "info"}
          size={14}
          color={showSetup ? colors.primary : colors.mutedForeground}
        />
        <Text
          style={[
            styles.setupToggleText,
            { color: showSetup ? colors.primary : colors.mutedForeground },
          ]}
        >
          {showSetup ? "Hide Supabase setup" : "Google not working? Tap to see setup"}
        </Text>
      </TouchableOpacity>

      {showSetup && (
        <View style={[styles.setupBox, { backgroundColor: colors.primary + "1A", borderColor: colors.primary + "33" }]}>
          <Text style={styles.setupTitle}>
            Add this URL to Supabase → Authentication → URL Configuration → Redirect URLs:
          </Text>

          {/* Selectable URL box */}
          <TouchableOpacity
            style={styles.urlBox}
            onLongPress={() => {
              Alert.alert(
                "Redirect URL",
                redirectUrl,
                [{ text: "OK" }]
              );
            }}
            onPress={() => {
              Alert.alert(
                "Copy this URL",
                redirectUrl,
                [{ text: "OK" }]
              );
            }}
          >
            <Text style={styles.urlText} selectable>
              {redirectUrl}
            </Text>
            <Feather name="copy" size={14} color="#1d4ed8" />
          </TouchableOpacity>

          <Text style={styles.setupNote}>
            Also add:{"\n"}
            • <Text style={styles.monoSmall}>mobile://auth/callback</Text>
            {"\n"}
            • <Text style={styles.monoSmall}>exp://**</Text> (wildcard for Expo Go){"\n\n"}
            Then in Supabase → Auth → Providers → Google, make sure Google is enabled and your OAuth credentials are set.
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  setupToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  setupToggleText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  setupBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  setupTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#475569",
    lineHeight: 16,
  },
  urlBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    padding: 10,
  },
  urlText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#64748b",
    lineHeight: 16,
  },
  setupNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    lineHeight: 17,
  },
  monoSmall: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
});
