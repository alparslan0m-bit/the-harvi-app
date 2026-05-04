import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
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

import { MasteryBar } from "@/components/MasteryBar";
import { RecentResultCard } from "@/components/RecentResultCard";
import { StatCard } from "@/components/StatCard";
import { StreakCard } from "@/components/StreakCard";
import { WeeklyChart } from "@/components/WeeklyChart";
import { useAuth } from "@/context/AuthContext";
import { useSyncStatus } from "@/context/SyncContext";
import { useColors } from "@/hooks/useColors";
import { useStats } from "@/hooks/useStats";

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useStats(user?.id);
  const { isOnline, pendingCount } = useSyncStatus();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0],
  });

  useFocusEffect(
    React.useCallback(() => {
      // Fade and slide in transition
      fadeAnim.setValue(0);
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }, [fadeAnim])
  );

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

      {/* ── Fixed header ──────────────────────────────────────────────── */}
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
      {/* ── Loading ───────────────────────────────────────────────────── */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* ── Error ────────────────────────────────────────────────────── */}
      {!isLoading && error && (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn't load stats</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {(error as Error).message}
          </Text>
        </View>
      )}

      {/* ── Content ──────────────────────────────────────────────────── */}
      {!isLoading && !error && (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        >
          {/* Key metrics */}
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                label="Quizzes"
                value={displayStats.total_quizzes}
                icon={<Feather name="check-square" size={18} color={colors.primary} />}
                accent
              />
              <StatCard
                label="Questions"
                value={displayStats.total_questions}
                icon={<Feather name="help-circle" size={18} color={colors.mutedForeground} />}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="Avg Score"
                value={`${Math.round(displayStats.average_score)}%`}
                icon={<Feather name="trending-up" size={18} color={colors.mutedForeground} />}
              />
              <StatCard
                label="Best Score"
                value={`${Math.round(displayStats.best_score)}%`}
                icon={<Feather name="award" size={18} color={colors.warning} />}
              />
            </View>
          </View>

          {/* Streak */}
          <StreakCard streak={displayStats.streak} />

          {/* Weekly activity */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Weekly Activity</Text>
              <Text style={[styles.weekTotal, { color: colors.mutedForeground }]}>
                {weekData.reduce((s, d) => s + d.count, 0)} quiz{weekData.reduce((s, d) => s + d.count, 0) !== 1 ? "zes" : ""} this week
              </Text>
            </View>
            <View style={{ marginTop: 20 }}>
              <WeeklyChart data={weekData} />
            </View>
          </View>

          {/* Lecture mastery */}
          {displayStats.subject_mastery.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable style={styles.sectionHeader} onPress={() => router.push("/stats/mastery")}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                  Lecture Mastery
                </Text>
                <View style={styles.seeAll}>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>
                    See all {displayStats.subject_mastery.length}
                  </Text>
                  <Feather name="chevron-right" size={15} color={colors.primary} />
                </View>
              </Pressable>
              <View style={{ marginTop: 16 }}>
                {displayStats.subject_mastery.slice(0, 3).map((item, i) => (
                  <MasteryBar key={i} subject={item.subject} mastery={item.mastery} />
                ))}
              </View>
              {displayStats.subject_mastery.length > 3 && (
                <Pressable
                  style={[styles.moreBtn, { borderColor: colors.border }]}
                  onPress={() => router.push("/stats/mastery")}
                >
                  <Text style={[styles.moreBtnText, { color: colors.primary }]}>
                    View {displayStats.subject_mastery.length - 3} more lectures
                  </Text>
                  <Feather name="arrow-right" size={14} color={colors.primary} />
                </Pressable>
              )}
            </View>
          )}

          {/* Empty nudge */}
          {isEmpty && (
            <View style={[styles.nudgeCard, { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }]}>
              <View style={[styles.nudgeIcon, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="bar-chart-2" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.nudgeTitle, { color: colors.foreground }]}>No stats yet</Text>
              <Text style={[styles.nudgeText, { color: colors.mutedForeground }]}>
                Complete your first quiz to start tracking your performance and progress.
              </Text>
            </View>
          )}

          {/* Recent results */}
          {displayStats.recent_results.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Results</Text>
              {displayStats.recent_results.slice(0, 10).map((result, i) => (
                <RecentResultCard key={i} result={result} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
      </Animated.View>
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

  statsGrid: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10 },

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
