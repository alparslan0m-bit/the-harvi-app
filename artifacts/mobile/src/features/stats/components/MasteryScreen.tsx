import React from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { 
  MasteryHeader, 
  MasterySearch, 
  MasteryFilterChips, 
  MasterySummaryPills, 
  MasteryLectureCard, 
  MasteryEmptyState 
} from "@/src/features/stats";

import { useAuth } from "@/src/shared/store/authStore";
import { useColors } from "@/src/shared/hooks/useColors";
import { useStats } from "@/src/features/stats/hooks/useStats";
import { useMasteryFilter } from "@/src/features/learn/hooks/useMasteryFilter";

/**
 * MasteryScreen - Refactored for modularity.
 * Displays a detailed leaderboard of lecture mastery with search and filtering.
 */
export function MasteryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: stats } = useStats(user?.id);

  const allData = stats?.subject_mastery ?? [];
  
  // Custom hook for filtering logic
  const {
    search,
    setSearch,
    filter,
    setFilter,
    counts,
    overallAvg,
    items,
  } = useMasteryFilter(allData);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <MasteryHeader 
        topPad={topPad} 
        allCount={allData.length} 
        overallAvg={overallAvg} 
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Summary pills ── */}
        {allData.length > 0 && <MasterySummaryPills counts={counts} />}

        {/* ── Search ── */}
        <MasterySearch search={search} setSearch={setSearch} />

        {/* ── Filter chips ── */}
        <MasteryFilterChips 
          filter={filter} 
          setFilter={setFilter} 
          counts={counts} 
          allCount={allData.length} 
        />

        {/* ── Cards ── */}
        <View style={styles.list}>
          {items.length === 0 ? (
            <MasteryEmptyState search={search} />
          ) : (
            items.map((item, i) => (
              <MasteryLectureCard
                key={i}
                subject={item.subject}
                mastery={item.mastery}
                attempts={item.attempts}
                rank={i + 1}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 20 },
});
