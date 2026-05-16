import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OptionButton } from "@/components";
import { QuizImage } from "@/components";
import { QuizLoadingScreen } from "@/components";
import { QuizReviewScreen } from "@/components";
import { ResultsView } from "@/components";
import { QuizErrorScreen } from "@/components";
import { useColors } from "@/hooks/useColors";
import { useQuizSession } from "@/hooks/useQuizSession";

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lectureId, lectureName } = useLocalSearchParams<{
    lectureId: string;
    lectureName: string;
  }>();

  const {
    questions,
    currentIndex,
    answered,
    correctCount,
    finished,
    submitting,
    saveError,
    savedOffline,
    reviewing,
    setReviewing,
    history,
    isLoading,
    error,
    cacheChecked,
    progressStyle,
    handleSelect,
    handleNext,
    handleRetry,
  } = useQuizSession(lectureId);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (!cacheChecked || (isLoading && !questions)) {
    return <QuizLoadingScreen lectureName={lectureName} />;
  }

  // ── Error / empty ─────────────────────────────────────────────────────────

  if (error || !questions || questions.length === 0) {
    return <QuizErrorScreen error={error as Error | null} lectureId={lectureId} />;
  }

  // ── Review screen ─────────────────────────────────────────────────────────

  if (reviewing) {
    return (
      <QuizReviewScreen
        history={history}
        totalCount={questions.length}
        topPad={topPad}
        onBack={() => setReviewing(false)}
      />
    );
  }

  // ── Results screen ────────────────────────────────────────────────────────

  if (finished) {
    const score = Math.round((correctCount / questions.length) * 100);
    return (
      <ResultsView
        score={score}
        correctCount={correctCount}
        totalCount={questions.length}
        submitting={submitting}
        savedOffline={savedOffline}
        saveError={saveError}
        lectureName={lectureName}
        onRetry={handleRetry}
        onReview={() => setReviewing(true)}
        onHome={() => router.replace("/(tabs)" as any)}
      />
    );
  }

  // ── Active quiz ───────────────────────────────────────────────────────────

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isCorrectAnswer =
    answered !== null && answered.selected === answered.correct;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        {/* Close button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </TouchableOpacity>

        {/* Lecture name */}
        <Text
          style={[styles.lectureName, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {lectureName}
        </Text>

        {/* Question counter chip */}
        <View
          style={[
            styles.counterChip,
            {
              backgroundColor: colors.muted + "80",
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.counterCurrent, { color: colors.foreground }]}>
            {currentIndex + 1}
          </Text>
          <Text
            style={[styles.counterTotal, { color: colors.mutedForeground }]}
          >
            /{questions.length}
          </Text>
        </View>
      </View>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: colors.primary },
            progressStyle,
          ]}
        />
      </View>

      {/* ── Question + options ───────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 130 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          key={currentIndex}
          entering={FadeInDown.duration(320).springify()}
        >
          {/* Question number label */}
          <View
            style={[styles.qChip, { backgroundColor: `${colors.primary}18` }]}
          >
            <Text style={[styles.qChipText, { color: colors.primary }]}>
              QUESTION {currentIndex + 1}
            </Text>
          </View>

          {/* Question text */}
          <Text style={[styles.questionText, { color: colors.foreground }]}>
            {question.text}
          </Text>

          {/* Question image (anatomy, X-ray, histology, ECG…) */}
          {!!question.image_url && (
            <View style={styles.imageWrap}>
              <QuizImage uri={question.image_url} />
            </View>
          )}

          {/* Options */}
          <View style={styles.options}>
            {question.options.map((opt, i) => (
              <OptionButton
                key={i}
                text={opt}
                index={i}
                answered={answered}
                onSelect={handleSelect}
              />
            ))}
          </View>

          {/* Explanation */}
          {answered && (
            <Animated.View
              entering={FadeInUp.duration(320).springify()}
              style={[
                styles.explanationBox,
                isCorrectAnswer
                  ? {
                      backgroundColor: colors.success + "12",
                      borderColor: colors.success + "4D",
                    }
                  : {
                      backgroundColor: colors.primary + "12",
                      borderColor: colors.primary + "4D",
                    },
              ]}
            >
              <View style={styles.explanationHeader}>
                <View
                  style={[
                    styles.explanationIconBox,
                    {
                      backgroundColor: isCorrectAnswer
                        ? colors.success + "22"
                        : colors.primary + "22",
                    },
                  ]}
                >
                  <Feather
                    name={isCorrectAnswer ? "check" : "info"}
                    size={13}
                    color={isCorrectAnswer ? colors.success : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.explanationTitle,
                    {
                      color: isCorrectAnswer ? colors.success : colors.primary,
                    },
                  ]}
                >
                  Explanation
                </Text>
              </View>
              <Text
                style={[styles.explanationText, { color: colors.foreground }]}
              >
                {answered.explanation ||
                  "No explanation available for this question."}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Next / Finish button ──────────────────────────────────────────── */}
      {answered && (
        <Animated.View
          entering={FadeIn.duration(220)}
          style={[
            styles.nextWrap,
            {
              paddingBottom: insets.bottom + 20,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            activeOpacity={0.88}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? "See Results" : "Next Question"}
            </Text>
            <Feather
              name={isLast ? "award" : "arrow-right"}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lectureName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  counterChip: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  counterCurrent: {
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.3,
  },
  counterTotal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // ── Progress bar ────────────────────────────────────────────────────────
  progressTrack: { height: 5, width: "100%" },
  progressFill: { height: "100%", borderRadius: 3 },

  // ── Quiz content ────────────────────────────────────────────────────────
  scroll: { padding: 20, paddingTop: 24 },

  qChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 14,
  },
  qChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.1,
  },

  questionText: {
    fontSize: 21,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.6,
    lineHeight: 28,
    marginBottom: 24,
  },

  imageWrap: { marginBottom: 20 },
  options: { gap: 10, marginBottom: 20 },

  // ── Explanation ─────────────────────────────────────────────────────────
  explanationBox: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 12,
  },
  explanationHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  explanationIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  explanationTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.1,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },

  // ── Next button ─────────────────────────────────────────────────────────
  nextWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
});

