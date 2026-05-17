import React from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

import {
  QuizLoadingScreen,
  QuizErrorScreen,
  QuizReviewScreen,
  ResultsView,
  QuizActiveHeader,
  QuizProgressBar,
  QuizQuestionContent,
  QuizNextButton,
} from "@/components";
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
        onHome={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)" as any);
          }
        }}
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
      <QuizActiveHeader
        lectureName={lectureName}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        topPad={topPad}
        colors={colors}
        onClose={() => router.back()}
      />

      <QuizProgressBar progressStyle={progressStyle} colors={colors} />

      <QuizQuestionContent
        question={question}
        currentIndex={currentIndex}
        answered={answered}
        isCorrectAnswer={isCorrectAnswer}
        colors={colors}
        onSelect={handleSelect}
        insets={insets}
      />

      <QuizNextButton
        answered={answered}
        isLast={isLast}
        colors={colors}
        onNext={handleNext}
        insets={insets}
      />
    </View>
  );
}
