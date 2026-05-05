import { Feather } from "@expo/vector-icons";
import { useScrollToTop } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MasteryBar, RecentResultCard, StreakCard, WeeklyChart, StatsMetricsGrid } from "@/components";

import { useAuth } from "@/context/AuthContext";
import { useSyncStatus } from "@/context/SyncContext";
import { useColors } from "@/hooks/useColors";
import { useStats } from "@/hooks/useStats";
import { useScreenAnimation } from "@/hooks/useScreenAnimation";

/**
 * StatsScreen - Refactored for modularity and performance.
 */
export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useStats(user?.id);
  const { isOnline, pendingCount } = useSyncStatus();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Reusable screen transition animation
  const { fadeAnim, translateY } = useScreenAnimation(scrollRef);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDow = new Date().getDay();
  const ZERO_WEEK = DAYS.map((day, i) => ({ day, count: 0, isToday: i === todayDow }));

  const displayStats = stats ?? {
    total_quizzes: 0,
    total_questions: 0,
    average_score: 0,
    best_score: 0,
    streak: 0,
    weekly_activity: ZERO_WEEK,
    subject_mastery: [],
    recent_results: [],
  };

  const weekData = displayStats.weekly_activity?.length ? displayStats.weekly_activity : ZERO_WEEK;
  const isEmpty = displayStats.total_quizzes === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* --- Fixed Header --- */}
      <View style={[styles.header, { paddingTop: topPad + 14, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Statistics</Text>
        </View>
        {!isOnline && (
          <View style={[styles.cachePill, { backgroundColor: "#fef3c7", marginBottom: 2 }]}>
            <Feather name="wifi-off" size={11} color="#92400e" />
            <Text style={[styles.cacheText, { color: "#92400e" }]}>
              {pendingCount > 0 ? `${pendingCount} offline` : "Offline mode"}
            </Text>
          </View>
        )}
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}>
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {!isLoading && error && <ErrorMessage message={(error as Error).message} />}

        {!isLoading && !error && (
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          >
            {/* Key metrics grid component */}
            <StatsMetricsGrid 
              totalQuizzes={displayStats.total_quizzes}
              totalQuestions={displayStats.total_questions}
              averageScore={displayStats.average_score}
              bestScore={displayStats.best_score}
            />

            <StreakCard streak={displayStats.streak} />

            {/* Weekly activity section */}
            <WeeklyActivitySection weekData={weekData} />

            {/* Lecture mastery section */}
            {displayStats.subject_mastery.length > 0 && (
              <MasterySection masteryData={displayStats.subject_mastery} />
            )}

            {/* Empty state nudge */}
            {isEmpty && <EmptyNudge />}

            {/* Recent results list */}
            {displayStats.recent_results.length > 0 && (
              <RecentResultsSection results={displayStats.recent_results} />
            )}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * Sub-components for cleaner JSX
 */

function ErrorMessage({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn't load stats</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

function WeeklyActivitySection({ weekData }: { weekData: any[] }) {
  const colors = useColors();
  const total = weekData.reduce((s, d) => s + d.count, 0);
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Weekly Activity</Text>
        <Text style={[styles.weekTotal, { color: colors.mutedForeground }]}>
          {total} quiz{total !== 1 ? "zes" : ""} this week
        </Text>
      </View>
      <View style={{ marginTop: 20 }}>
        <WeeklyChart data={weekData} />
      </View>
    </View>
  );
}

function MasterySection({ masteryData }: { masteryData: any[] }) {
  const colors = useColors();
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable style={styles.sectionHeader} onPress={() => router.push("/stats/mastery")}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Lecture Mastery</Text>
        <View style={styles.seeAll}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>See all {masteryData.length}</Text>
          <Feather name="chevron-right" size={15} color={colors.primary} />
        </View>
      </Pressable>
      <View style={{ marginTop: 16 }}>
        {masteryData.slice(0, 3).map((item, i) => (
          <MasteryBar key={i} subject={item.subject} mastery={item.mastery} />
        ))}
      </View>
      {masteryData.length > 3 && (
        <Pressable style={[styles.moreBtn, { borderColor: colors.border }]} onPress={() => router.push("/stats/mastery")}>
          <Text style={[styles.moreBtnText, { color: colors.primary }]}>
            View {masteryData.length - 3} more lectures
          </Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

function EmptyNudge() {
  const colors = useColors();
  return (
    <View style={[styles.nudgeCard, { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }]}>
      <View style={[styles.nudgeIcon, { backgroundColor: colors.primary + "20" }]}>
        <Feather name="bar-chart-2" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.nudgeTitle, { color: colors.foreground }]}>No stats yet</Text>
      <Text style={[styles.nudgeText, { color: colors.mutedForeground }]}>
        Complete your first quiz to start tracking your performance and progress.
      </Text>
    </View>
  );
}

function RecentResultsSection({ results }: { results: any[] }) {
  const colors = useColors();
  return (
    <View style={styles.recentSection}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Results</Text>
      {results.slice(0, 10).map((result, i) => (
        <RecentResultCard key={i} result={result} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  title: { fontSize: 36, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },
  cachePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  cacheText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  content: { paddingTop: 20 },
  section: { marginHorizontal: 20, marginBottom: 16, padding: 20, borderRadius: 20, borderWidth: 1 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  moreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  moreBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  weekTotal: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recentSection: { paddingHorizontal: 20, marginBottom: 16 },
  nudgeCard: {
    marginHorizontal: 20, marginBottom: 16, padding: 24,
    borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 10,
  },
  nudgeIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nudgeTitle: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  nudgeText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
