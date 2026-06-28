import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function LearnErrorState({ error, onRetry }: { error: Error | null | undefined; onRetry: () => void }) {
  const colors = useColors();
  const msg = error?.message || "";
  const isRLS = msg.includes("row-level security") || msg.includes("42501");
  const isMissing = (msg.includes("relation") && msg.includes("does not exist")) || msg.includes("42P01");

  return (
    <ScrollView contentContainerStyle={styles.errorContainer}>
      <View style={[styles.errorIcon, { backgroundColor: colors.destructive + "1A" }]}>
        <Feather name="alert-triangle" size={28} color={colors.destructive} />
      </View>
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>
        {isMissing ? "Database tables not found" : isRLS ? "Access denied" : "Could not load content"}
      </Text>
      
      {isMissing && (
        <View style={[styles.infoBox, { backgroundColor: colors.destructive + "1A", borderColor: colors.destructive + "33" }]}>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            One or more tables (<Text style={styles.mono}>years</Text>, <Text style={styles.mono}>modules</Text>, <Text style={styles.mono}>subjects</Text>, <Text style={styles.mono}>lectures</Text>) are missing.{"\n\n"}
            Go to <Text style={styles.bold}>Supabase → SQL Editor</Text> and run your schema migration.
          </Text>
        </View>
      )}

      {isRLS && (
        <View style={[styles.infoBox, { backgroundColor: colors.warning + "1A", borderColor: colors.warning + "33" }]}>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Row Level Security is blocking reads.{"\n\n"}
            In <Text style={styles.bold}>Supabase → Auth → Policies</Text>, add a <Text style={styles.mono}>SELECT</Text> policy for authenticated users.
          </Text>
        </View>
      )}

      {!isMissing && !isRLS && (
        <View style={[styles.infoBox, { backgroundColor: colors.primary + "1A", borderColor: colors.primary + "33" }]}>
          <Text style={[styles.infoText, { color: colors.foreground }]} selectable>{msg}</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={onRetry}>
        <Feather name="refresh-cw" size={16} color="#fff" />
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errorContainer: { alignItems: "center", paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60, gap: 16 },
  errorIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  errorTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  infoBox: { width: "100%", padding: 16, borderRadius: 14, borderWidth: 1 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bold: { fontFamily: "Inter_700Bold" },
  mono: { fontFamily: "Inter_600SemiBold" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
