import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/src/shared/hooks/useColors";

export function MasteryHeader({ 
  topPad, 
  allCount, 
  overallAvg 
}: { topPad: number; allCount: number; overallAvg: number }) {
  const colors = useColors();
  return (
    <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Lecture Mastery</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {allCount} lecture{allCount !== 1 ? "s" : ""} tracked
        </Text>
      </View>
      <View style={[styles.avgBadge, { backgroundColor: colors.primary + "1A" }]}>
        <Text style={[styles.avgLabel, { color: colors.primary }]}>Avg</Text>
        <Text style={[styles.avgValue, { color: colors.primary }]}>{overallAvg}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 26, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  avgBadge: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 1,
  },
  avgLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  avgValue: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
});
