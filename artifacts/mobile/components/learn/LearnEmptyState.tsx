import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function LearnEmptyState() {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "1A" }]}>
        <Feather name="book-open" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No content yet</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        Your content will appear here once years and modules are added to your database.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { alignItems: "center", paddingHorizontal: 40, paddingTop: 60, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
