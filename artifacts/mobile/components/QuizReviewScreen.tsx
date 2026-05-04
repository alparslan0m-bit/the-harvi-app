import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuizImage } from "@/components/QuizImage";
import { useColors } from "@/hooks/useColors";
import { HistoryItem } from "@/types";

interface Props {
  history: HistoryItem[];
  totalCount: number;
  topPad: number;
  onBack: () => void;
}

export function QuizReviewScreen({ history, totalCount, topPad, onBack }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const correctCount = history.filter((h) => h.selected === h.correct).length;
  const wrongCount = totalCount - correctCount;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.75}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Review Answers</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {totalCount} question{totalCount !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* ── Summary strip ── */}
      <View style={[styles.summaryStrip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: "#4ade80" }]} />
          <Text style={[styles.summaryNum, { color: "#16a34a" }]}>{correctCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Correct</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: "#f87171" }]} />
          <Text style={[styles.summaryNum, { color: "#dc2626" }]}>{wrongCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Wrong</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.summaryNum, { color: colors.foreground }]}>{totalCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
      </View>

      {/* ── Question cards ── */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {history.map((item, qi) => {
          const isCorrect = item.selected === item.correct;
          const accentColor = isCorrect ? "#16a34a" : "#dc2626";
          const accentBg = isCorrect ? "#f0fdf4" : "#fef2f2";
          const accentBorder = isCorrect ? "#bbf7d0" : "#fecaca";

          return (
            <Animated.View
              key={qi}
              entering={FadeInDown.delay(qi * 40).duration(350).springify()}
              style={[styles.card, { backgroundColor: colors.card, borderColor: accentBorder }]}
            >
              {/* Card header */}
              <View style={[styles.cardHeader, { backgroundColor: accentBg, borderBottomColor: accentBorder }]}>
                <View style={[styles.qNumBadge, { backgroundColor: accentColor + "22" }]}>
                  <Text style={[styles.qNumText, { color: accentColor }]}>Q{qi + 1}</Text>
                </View>
                <Text style={[styles.cardStatus, { color: accentColor }]}>
                  {isCorrect ? "Correct" : "Incorrect"}
                </Text>
                <Feather
                  name={isCorrect ? "check-circle" : "x-circle"}
                  size={17}
                  color={accentColor}
                />
              </View>

              <View style={styles.cardBody}>
                {/* Question text */}
                <Text style={[styles.questionText, { color: colors.foreground }]}>
                  {item.question.text}
                </Text>

                {/* Question image */}
                {!!item.question.image_url && (
                  <View style={styles.reviewImageWrap}>
                    <QuizImage uri={item.question.image_url} />
                  </View>
                )}

                {/* Options */}
                <View style={styles.optionList}>
                  {item.question.options.map((opt, oi) => {
                    const isCorrectOpt = oi === item.correct;
                    const isSelectedOpt = oi === item.selected;

                    let bg = "transparent";
                    let border = "transparent";
                    let textCol = colors.mutedForeground;
                    let labelBg = colors.muted;
                    let labelColor = colors.mutedForeground;

                    if (isCorrectOpt) {
                      bg = "#dcfce7"; border = "#4ade80";
                      textCol = "#14532d"; labelBg = "#4ade80"; labelColor = "#fff";
                    } else if (isSelectedOpt) {
                      bg = "#fee2e2"; border = "#f87171";
                      textCol = "#7f1d1d"; labelBg = "#f87171"; labelColor = "#fff";
                    }

                    return (
                      <View key={oi} style={[styles.optionRow, { backgroundColor: bg, borderColor: border }]}>
                        <View style={[styles.optionBadge, { backgroundColor: labelBg }]}>
                          <Text style={[styles.optionBadgeText, { color: labelColor }]}>
                            {String.fromCharCode(65 + oi)}
                          </Text>
                        </View>
                        <Text style={[styles.optionText, { color: textCol }]} numberOfLines={3}>
                          {opt}
                        </Text>
                        {isCorrectOpt && <Feather name="check" size={14} color="#16a34a" />}
                        {isSelectedOpt && !isCorrectOpt && <Feather name="x" size={14} color="#dc2626" />}
                      </View>
                    );
                  })}
                </View>

                {/* Explanation */}
                {!!item.explanation && (
                  <View style={[styles.explanation, { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }]}>
                    <Feather name="info" size={13} color="#0284c7" />
                    <Text style={styles.explanationText}>{item.explanation}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // ── Summary strip ───────────────────────────────────────────────────────
  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 3 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryNum: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 8 },

  // ── Cards ───────────────────────────────────────────────────────────────
  list: { padding: 16, gap: 14 },

  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  qNumBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
  },
  qNumText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  cardStatus: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },

  cardBody: { padding: 14, gap: 10 },

  questionText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
    letterSpacing: -0.2,
  },

  reviewImageWrap: { marginBottom: 4 },

  // ── Options in review ───────────────────────────────────────────────────
  optionList: { gap: 6 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  optionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  // ── Explanation ─────────────────────────────────────────────────────────
  explanation: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
  },
  explanationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#0c4a6e",
    lineHeight: 19,
  },
});
