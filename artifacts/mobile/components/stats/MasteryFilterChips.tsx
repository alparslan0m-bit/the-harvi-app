import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { FilterKey } from "@/hooks/useMasteryFilter";

const FILTERS: { key: FilterKey; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "all",       label: "All",        icon: "layers" },
  { key: "strong",    label: "Strong",     icon: "trending-up" },
  { key: "improving", label: "Improving",  icon: "activity" },
  { key: "weak",      label: "Needs Work", icon: "alert-circle" },
];

export function MasteryFilterChips({ 
  filter, 
  setFilter, 
  counts, 
  allCount 
}: { 
  filter: FilterKey; 
  setFilter: (k: FilterKey) => void; 
  counts: { strong: number; improving: number; weak: number };
  allCount: number;
}) {
  const colors = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {FILTERS.map((f) => {
        const active = filter === f.key;
        const cnt =
          f.key === "all" ? allCount :
          f.key === "strong" ? counts.strong :
          f.key === "improving" ? counts.improving :
          counts.weak;
        return (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.background,
                borderColor:     active ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather
              name={f.icon}
              size={12}
              color={active ? "#fff" : colors.mutedForeground}
            />
            <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
              {f.label}
            </Text>
            <View style={[styles.chipCount, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.muted }]}>
              <Text style={[styles.chipCountText, { color: active ? "#fff" : colors.mutedForeground }]}>
                {cnt}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chipRow: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chipCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  chipCountText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
