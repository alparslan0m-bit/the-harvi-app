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

import { useColors } from "@/src/shared/hooks/useColors";
import { useQuizResultsAnimation } from "@/src/features/quiz/hooks/useQuizResultsAnimation";
import { ScoreRing } from "./ScoreRing";
import { StatPill } from "./StatPill";
import { getGrade, getRingColor, getTitle } from "@/src/features/quiz/utils/quizHelpers";

export interface ResultsViewProps {
  score: number;
  correctCount: number;
  totalCount: number;
  submitting: boolean;
  savedOffline: boolean;
  saveError: string | null;
  onRetry: () => void;
  onReview: () => void;
  onHome: () => void;
}

export function ResultsView({
  score,
  correctCount,
  totalCount,
  onRetry,
  onReview,
  onHome,
}: ResultsViewProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { displayScore, ringAnimStyle } = useQuizResultsAnimation(score);

  const ringColor = getRingColor(score, colors);
  const grade = getGrade(score);
  const { text: titleText, icon: feedbackIcon } = getTitle(score);
  const wrongCount = totalCount - correctCount;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 48, paddingTop: insets.top + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScoreRing
          displayScore={displayScore}
          ringColor={ringColor}
          grade={grade}
          ringAnimStyle={ringAnimStyle}
        />

        <Animated.View
          entering={FadeInDown.delay(200).duration(400).springify()}
          style={styles.titleGroup}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {titleText}
            </Text>
            <Feather name={feedbackIcon} size={28} color={ringColor} />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(400).springify()}
          style={styles.pills}
        >
          <StatPill
            value={correctCount}
            label="Correct"
            color={colors.success}
            icon="check-circle"
          />
          <StatPill
            value={wrongCount}
            label="Wrong"
            color={colors.destructive}
            icon="x-circle"
          />
          <StatPill
            value={totalCount}
            label="Total"
            color={colors.primary}
            icon="help-circle"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(500).duration(400).springify()}
          style={styles.btnGroup}
        >
          <TouchableOpacity
            style={[
              styles.btn,
              styles.primaryBtn,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={onRetry}
            activeOpacity={0.88}
          >
            <Feather name="refresh-cw" size={18} color="#fff" />
            <Text style={[styles.btnText, { color: "#fff" }]}>Retry Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              {
                backgroundColor: colors.card,
                borderWidth: 1.5,
                borderColor: colors.border,
              },
            ]}
            onPress={onReview}
            activeOpacity={0.88}
          >
            <Feather name="list" size={18} color={colors.foreground} />
            <Text style={[styles.btnText, { color: colors.foreground }]}>
              Review Answers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: "transparent", marginTop: 4 },
            ]}
            onPress={onHome}
            activeOpacity={0.7}
          >
            <Feather name="home" size={18} color={colors.mutedForeground} />
            <Text style={[styles.btnText, { color: colors.mutedForeground }]}>
              Go Home
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  titleGroup: {
    alignItems: "center",
    marginBottom: 28,
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.9,
    textAlign: "center",
  },
  pills: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 16,
  },
  btnGroup: {
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
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
  btnText: {
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: 0,
  },
});
