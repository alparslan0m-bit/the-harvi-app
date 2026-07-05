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

import { QuizImage } from "./QuizImage";
import { useColors } from "@/src/shared/hooks/useColors";
import { HistoryItem } from "@/src/shared/types";

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
      <View style={[styles.header, { paddingTop: topPad + 14, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
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
            {totalCount} medical question{totalCount !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* ── Summary strip ── */}
      <View style={[styles.summaryStrip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.summaryNum, { color: colors.success }]}>{correctCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Correct</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.destructive }]} />
          <Text style={[styles.summaryNum, { color: colors.destructive }]}>{wrongCount}</Text>
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
          const accentColor = isCorrect ? colors.success : colors.destructive;
          const accentBg = isCorrect ? colors.success + "12" : colors.destructive + "12";
          const accentBorder = isCorrect ? colors.success + "4D" : colors.destructive + "4D";

          return (
            <Animated.View
              key={qi}
              entering={FadeInDown.delay(qi * 40).duration(350).springify()}
              style={[styles.card, { backgroundColor: colors.card, borderColor: accentBorder }]}
            >
              <View style={[styles.innerBorder, { borderColor: accentColor + "20" }]} />
              {/* Card header */}
              <View style={[styles.cardHeader, { backgroundColor: accentBg, borderBottomColor: accentBorder }]}>
                <View style={[styles.qNumBadge, { backgroundColor: accentColor + "22" }]}>
                  <Text style={[styles.qNumText, { color: accentColor }]}>Q{qi + 1}</Text>
                </View>
                <Text style={[styles.cardStatus, { color: accentColor }]}>
                  {isCorrect ? "Correctly Answered" : "Needs Review"}
                </Text>
                <Feather
                  name={isCorrect ? "check-circle" : "alert-circle"}
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

                    let bg: string = "transparent";
                    let border: string = "transparent";
                    let textCol: string = colors.mutedForeground;
                    let labelBg: string = colors.muted;
                    let labelColor: string = colors.mutedForeground;

                    if (isCorrectOpt) {
                      bg = colors.success + "12"; border = colors.success + "4D";
                      textCol = colors.foreground; labelBg = colors.success; labelColor = "#fff";
                    } else if (isSelectedOpt) {
                      bg = colors.destructive + "12"; border = colors.destructive + "4D";
                      textCol = colors.foreground; labelBg = colors.destructive; labelColor = "#fff";
                    }

                    return (
                      <View key={oi} style={[styles.optionRow, { backgroundColor: bg, borderColor: border }]}>
                        <View style={[styles.optionBadge, { backgroundColor: labelBg }]}>
                          <Text style={[styles.optionBadgeText, { color: labelColor }]}>
                            {String.fromCharCode(65 + oi)}
                          </Text>
                        </View>
                        <Text style={[styles.optionText, { color: textCol }]} numberOfLines={5}>
                          {opt}
                        </Text>
                        {isCorrectOpt && <Feather name="check" size={14} color={colors.success} />}
                        {isSelectedOpt && !isCorrectOpt && <Feather name="x" size={14} color={colors.destructive} />}
                      </View>
                    );
                  })}
                </View>

                {/* Explanation */}
                {!!item.explanation && (
                  <View style={[styles.explanation, { backgroundColor: colors.primary + "0A", borderColor: colors.primary + "20" }]}>
                    <View style={[styles.explanationStripe, { backgroundColor: colors.primary }]} />
                    <View style={styles.explanationContent}>
                      <View style={styles.explanationHeader}>
                        <Feather name="info" size={13} color={colors.primary} />
                        <Text style={[styles.explanationLabel, { color: colors.primary }]}>EXPLANATION</Text>
                      </View>
                      <Text style={[styles.explanationText, { color: colors.foreground }]}>{item.explanation}</Text>
                    </View>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  headerTitle: { fontSize: 28, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },

  // ── Summary strip ───────────────────────────────────────────────────────
  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryNum: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.8 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  summaryDivider: { width: 1, height: 38, marginHorizontal: 8 },

  // ── Cards ───────────────────────────────────────────────────────────────
  list: { padding: 16, gap: 16 },

  card: {
    borderRadius: 26,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1.5,
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  qNumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qNumText: { fontSize: 12, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.2 },
  cardStatus: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },

  cardBody: { padding: 18, gap: 14 },

  questionText: {
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
    lineHeight: 24,
    letterSpacing: -0.2,
  },

  reviewImageWrap: { marginBottom: 4 },

  // ── Options in review ───────────────────────────────────────────────────
  optionList: { gap: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },

  // ── Explanation ─────────────────────────────────────────────────────────
  explanation: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 4,
    overflow: "hidden",
  },
  explanationStripe: {
    width: 5,
    height: "100%",
  },
  explanationContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  explanationLabel: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
});

