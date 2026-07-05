import { Feather } from "@expo/vector-icons";
import { useScrollToTop } from "@react-navigation/native";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  StreakCard,
  StatsMetricsGrid,
  WeeklyActivitySection,
  MasterySection,
  EmptyNudge,
  RecentResultsSection,
  StatsErrorView,
} from "@/src/features/stats";

import { useAuth } from "@/src/shared/store/authStore";
import { useSyncStatus } from "@/src/shared/store/syncStore";
import { useColors } from "@/src/shared/hooks/useColors";
import { useStats } from "@/src/features/stats/hooks/useStats";
import { useScreenAnimation } from "@/src/shared/hooks/useScreenAnimation";

/**
 * StatsScreen - Refactored for modularity and performance.
 */
export function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useStats(user?.id);
  const { isOnline, pendingCount } = useSyncStatus();

  const scrollRef = useRef<any>(null);
  useScrollToTop(scrollRef as any);

  // Reusable screen transition animation
  const { fadeAnim, translateY } = useScreenAnimation(scrollRef);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDow = new Date().getDay();
  const ZERO_WEEK = DAYS.map((day, i) => ({
    day,
    count: 0,
    isToday: i === todayDow,
  }));

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

  const weekData = displayStats.weekly_activity?.length
    ? displayStats.weekly_activity
    : ZERO_WEEK;
  const isEmpty = displayStats.total_quizzes === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* --- Fixed Header --- */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 14,
            borderBottomColor: "transparent",
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Performance
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your medical learning journey
          </Text>
        </View>
        {!isOnline && (
          <View
            style={[
              styles.cachePill,
              { backgroundColor: colors.warning + "1A" },
            ]}
          >
            <Feather name="wifi-off" size={12} color={colors.warning} />
            <Text style={[styles.cacheText, { color: colors.warning }]}>
              {pendingCount > 0 ? `${pendingCount} pending` : "Offline"}
            </Text>
          </View>
        )}
      </View>

      <Animated.View
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}
      >
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {!isLoading && error && (
          <StatsErrorView message={(error as Error).message} />
        )}

        {!isLoading && !error && (
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + 100 },
            ]}
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 38,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: -2 },
  cachePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
  },
  cacheText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  content: { paddingTop: 12 },
});

