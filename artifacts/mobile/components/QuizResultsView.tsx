import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

// ── Score tier helpers ────────────────────────────────────────────────────────

function getRingColor(score: number, colors: ReturnType<typeof useColors>): string {
  if (score >= 80) return colors.success;
  if (score >= 70) return colors.warning;
  if (score >= 60) return colors.warning;
  return colors.destructive;
}

function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getTitle(score: number): string {
  if (score >= 90) return "Outstanding!";
  if (score >= 80) return "Well done!";
  if (score >= 70) return "Good effort!";
  if (score >= 60) return "Keep going!";
  return "Keep practising!";
}

function getMessage(score: number): string {
  if (score >= 90) return "Outstanding! You've mastered this material.";
  if (score >= 80) return "Great job! You have a solid grasp of this.";
  if (score >= 70) return "Good effort! A bit more practice for perfection.";
  if (score >= 60) return "Nice pass! Review the answers to fill the gaps.";
  return "Review your answers and try again to improve.";
}

function getFeedbackIcon(score: number): React.ComponentProps<typeof Feather>["name"] {
  if (score >= 90) return "star";
  if (score >= 80) return "award";
  if (score >= 70) return "trending-up";
  return "book-open";
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  value, label, color, icon,
}: {
  value: number;
  label: string;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}) {
  const colors = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: color + "14", borderColor: color + "35" }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.pillNum, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ── Results view ──────────────────────────────────────────────────────────────

export interface ResultsViewProps {
  score: number;
  correctCount: number;
  totalCount: number;
  submitting: boolean;
  savedOffline: boolean;
  saveError: string | null;
  lectureName?: string;
  topPad: number;
  onRetry: () => void;
  onReview: () => void;
  onHome: () => void;
}

export function ResultsView({
  score, correctCount, totalCount,
  submitting, savedOffline, saveError,
  lectureName, topPad,
  onRetry, onReview, onHome,
}: ResultsViewProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Count-up animation
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.ceil(score / 35));
    const timer = setInterval(() => {
      current = Math.min(current + step, score);
      setDisplayScore(current);
      if (current >= score) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  // Ring entrance animation
  const ringScale = useSharedValue(0.55);
  const ringOpacity = useSharedValue(0);
  useEffect(() => {
    ringScale.value = withSpring(1, { damping: 16, stiffness: 160 });
    ringOpacity.value = withTiming(1, { duration: 450 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ringAnim = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const ringColor = getRingColor(score, colors);
  const grade = getGrade(score);
  const title = getTitle(score);
  const message = getMessage(score);
  const wrongCount = totalCount - correctCount;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48, paddingTop: insets.top + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Score ring ── */}
        <Animated.View style={[styles.ringWrap, ringAnim]}>
          <View style={[styles.ringOuter, { borderColor: ringColor + "28" }]}>
            <View style={[styles.ringInner, { borderColor: ringColor }]}>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreNum, { color: ringColor }]}>{displayScore}</Text>
                <Text style={[styles.scorePct, { color: ringColor }]}>%</Text>
              </View>
              <Text style={[styles.gradeHint, { color: ringColor + "99" }]}>out of 100</Text>
            </View>
          </View>
          <View style={[styles.gradeBadge, { backgroundColor: ringColor }]}>
            <Text style={styles.gradeText}>{grade}</Text>
          </View>
        </Animated.View>

        {/* ── Title + lecture name ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.titleGroup}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {!!lectureName && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
              {lectureName}
            </Text>
          )}
        </Animated.View>

        {/* ── Stat pills ── */}
        <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} style={styles.pills}>
          <StatPill value={correctCount} label="Correct"  color={colors.success}        icon="check-circle" />
          <StatPill value={wrongCount}   label="Wrong"    color={colors.destructive}        icon="x-circle" />
          <StatPill value={totalCount}   label="Total"    color={colors.primary} icon="help-circle" />
        </Animated.View>

        {/* ── Feedback card ── */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400).springify()}
          style={[styles.feedbackCard, { backgroundColor: ringColor + "0f", borderColor: ringColor + "30" }]}
        >
          <View style={[styles.feedbackIcon, { backgroundColor: ringColor + "20" }]}>
            <Feather name={getFeedbackIcon(score)} size={16} color={ringColor} />
          </View>
          <Text style={[styles.feedbackText, { color: colors.foreground }]}>{message}</Text>
        </Animated.View>

        {/* ── Save status ── */}
        {submitting && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Saving results…</Text>
          </Animated.View>
        )}

        {saveError && !savedOffline && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.statusPill, { backgroundColor: colors.destructive + "1A", borderColor: colors.destructive + "4D" }]}
          >
            <Feather name="alert-triangle" size={13} color={colors.destructive} />
            <Text style={[styles.statusText, { color: colors.destructive, flex: 1 }]} selectable>
              Save failed: {saveError}
            </Text>
          </Animated.View>
        )}

        {/* ── Action buttons ── */}
        <Animated.View entering={FadeInDown.delay(500).duration(400).springify()} style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Feather name="refresh-cw" size={18} color="#fff" />
            <Text style={[styles.btnText, { color: "#fff" }]}>Retry Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]}
            onPress={onReview}
            activeOpacity={0.8}
          >
            <Feather name="list" size={18} color={colors.foreground} />
            <Text style={[styles.btnText, { color: colors.foreground }]}>Review Answers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "transparent", marginTop: 4 }]}
            onPress={onHome}
            activeOpacity={0.6}
          >
            <Feather name="home" size={18} color={colors.mutedForeground} />
            <Text style={[styles.btnText, { color: colors.mutedForeground }]}>Go Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { alignItems: "center", paddingHorizontal: 24, paddingTop: 8 },

  // Ring
  ringWrap: { alignItems: "center", marginTop: 0, marginBottom: 28 },
  ringOuter: {
    width: 158,
    height: 158,
    borderRadius: 79,
    borderWidth: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 7,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  scoreNum: { fontSize: 44, fontFamily: "Inter_700Bold", letterSpacing: -2, lineHeight: 48 },
  scorePct: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 5 },
  gradeHint: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.2 },
  gradeBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  gradeText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },

  // Title
  titleGroup: { alignItems: "center", gap: 6, marginBottom: 24, width: "100%" },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.9, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 280 },

  // Pills
  pills: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 16 },
  pill: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 6, borderRadius: 18, borderWidth: 1, gap: 5 },
  pillNum: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  pillLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

  // Feedback
  feedbackCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    width: "100%",
    marginBottom: 16,
  },
  feedbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  feedbackText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },

  // Status
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  statusPill: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
    marginBottom: 16,
  },
  statusText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  // Buttons
  btnGroup: { gap: 12, width: "100%", marginTop: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 24,
  },
  primaryBtn: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  btnText: { fontSize: 17, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0 },
});
