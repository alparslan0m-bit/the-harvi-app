import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useQueryClient } from "@tanstack/react-query";

import { OptionButton } from "@/components/OptionButton";
import { QuizImage } from "@/components/QuizImage";
import { QuizLoadingScreen } from "@/components/QuizLoadingScreen";
import { QuizReviewScreen } from "@/components/QuizReviewScreen";
import { ResultsView } from "@/components/QuizResultsView";
import { useAuth } from "@/context/AuthContext";
import { useSyncStatus } from "@/context/SyncContext";
import { useColors } from "@/hooks/useColors";
import { useQuizQuestions } from "@/hooks/useQuiz";
import { optimisticallyMarkComplete } from "@/hooks/useProgress";
import { decryptAnswer } from "@/lib/crypto";
import { loadQuestionsFromCache } from "@/lib/questionCache";
import { enqueueQuizResult } from "@/lib/offlineQueue";
import { supabase } from "@/lib/supabase";
import { AnsweredState, HistoryItem, Question } from "@/types";

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { lectureId, lectureName } = useLocalSearchParams<{
    lectureId: string;
    lectureName: string;
  }>();
  const { user } = useAuth();
  const { isOnline } = useSyncStatus();

  // ── Fast path: pre-load from AsyncStorage before RQ resolves ─────────────
  const [cachedQuestions, setCachedQuestions] = useState<
    Question[] | undefined
  >();
  const [cacheChecked, setCacheChecked] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    loadQuestionsFromCache(lectureId).then((hit) => {
      if (!mountedRef.current) return;
      if (hit?.questions.length) setCachedQuestions(hit.questions);
      setCacheChecked(true);
    });
    return () => {
      mountedRef.current = false;
    };
  }, [lectureId]);

  const {
    data: remoteQuestions,
    isLoading,
    error,
  } = useQuizQuestions(lectureId, cachedQuestions);

  // ── Quiz session state ────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<Question[] | null>(null);

  // Lock in the questions once they arrive (either from cache or remote)
  // This prevents the "switcheroo" bug where background refreshes shuffle
  // the questions while the user is mid-quiz.
  useEffect(() => {
    if (!questions && remoteQuestions && remoteQuestions.length > 0) {
      setQuestions(remoteQuestions);
    }
  }, [remoteQuestions, questions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState<AnsweredState | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // Animated progress bar width
  const progressAnim = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%` as `${number}%`,
  }));

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (selectedIndex: number) => {
      if (!questions) return;
      const q: Question = questions[currentIndex];
      const { answer, explanation } = decryptAnswer(q.secure);
      // answer === -1 means decryption failed — no option should be marked correct
      const isCorrect = answer >= 0 && selectedIndex === answer;

      Haptics.notificationAsync(
        isCorrect
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );

      setAnswered({ selected: selectedIndex, correct: answer, explanation });
      if (isCorrect) setCorrectCount((c) => c + 1);
      setHistory((h) => [
        ...h,
        { question: q, selected: selectedIndex, correct: answer, explanation },
      ]);
    },
    [questions, currentIndex],
  );

  const handleNext = useCallback(async () => {
    if (!questions) return;
    const isLast = currentIndex === questions.length - 1;

    if (isLast) {
      setFinished(true);
      setSubmitting(true);
      setSaveError(null);
      setSavedOffline(false);

      const score = Math.round((correctCount / questions.length) * 100);
      const now = new Date().toISOString();

      if (!isOnline) {
        await enqueueQuizResult({
          userId: user?.id ?? "",
          lectureId: lectureId ?? "",
          score,
          totalQuestions: questions.length,
          correctAnswers: correctCount,
          createdAt: now,
        });
        if (user?.id && lectureId)
          await optimisticallyMarkComplete(user.id, lectureId);
        setSavedOffline(true);
      } else {
        const { error: insertErr } = await supabase
          .from("quiz_results")
          .insert({
            user_id: user?.id,
            lecture_id: lectureId,
            score,
            total_questions: questions.length,
            correct_answers: correctCount,
            created_at: now,
          });

        if (insertErr) {
          await enqueueQuizResult({
            userId: user?.id ?? "",
            lectureId: lectureId ?? "",
            score,
            totalQuestions: questions.length,
            correctAnswers: correctCount,
            createdAt: now,
          });
          if (user?.id && lectureId)
            await optimisticallyMarkComplete(user.id, lectureId);
          setSavedOffline(true);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setSubmitting(false);
    } else {
      setCurrentIndex((i) => i + 1);
      setAnswered(null);
    }
  }, [
    questions,
    currentIndex,
    correctCount,
    user,
    lectureId,
    queryClient,
    isOnline,
  ]);

  const handleRetry = useCallback(() => {
    setQuestions(null); // Unlock questions to allow fresh data/shuffle
    setCurrentIndex(0);
    setAnswered(null);
    setCorrectCount(0);
    setFinished(false);
    setSubmitting(false);
    setSaveError(null);
    setSavedOffline(false);
    setReviewing(false);
    setHistory([]);
    progressAnim.value = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep progress bar in sync
  useEffect(() => {
    if (!questions) return;
    progressAnim.value = withSpring((currentIndex + 1) / questions.length, {
      damping: 22,
      stiffness: 140,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (!cacheChecked || (isLoading && !questions)) {
    return <QuizLoadingScreen lectureName={lectureName} />;
  }

  // ── Error / empty ─────────────────────────────────────────────────────────

  if (error || !questions || questions.length === 0) {
    const isOfflineError = !!(error as Error)?.message?.includes("offline");

    return (
      <View
        style={[
          styles.centerScreen,
          { backgroundColor: colors.background, paddingHorizontal: 28 },
        ]}
      >
        <View
          style={[
            styles.errorIcon,
            { backgroundColor: isOfflineError ? "#fef9c3" : "#fef2f2" },
          ]}
        >
          <Feather
            name={isOfflineError ? "wifi-off" : "alert-circle"}
            size={32}
            color={isOfflineError ? "#92400e" : colors.destructive}
          />
        </View>
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          {isOfflineError
            ? "Not downloaded"
            : error
              ? "Failed to load"
              : "No questions"}
        </Text>
        <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
          {isOfflineError
            ? `Go back to the subject and tap "Download offline" while connected to the internet.`
            : error
              ? (error as Error).message
              : `No questions are linked to this lecture.\n\nLecture ID: ${lectureId}`}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.errorBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.errorBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
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
        topPad={topPad}
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
        <View style={[styles.counterChip, { backgroundColor: colors.muted }]}>
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
                  ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }
                  : { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" },
              ]}
            >
              <View style={styles.explanationHeader}>
                <View
                  style={[
                    styles.explanationIconBox,
                    {
                      backgroundColor: isCorrectAnswer ? "#dcfce7" : "#e0f2fe",
                    },
                  ]}
                >
                  <Feather
                    name={isCorrectAnswer ? "check" : "info"}
                    size={13}
                    color={isCorrectAnswer ? "#16a34a" : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.explanationTitle,
                    { color: isCorrectAnswer ? "#16a34a" : colors.primary },
                  ]}
                >
                  Explanation
                </Text>
              </View>
              <Text
                style={[
                  styles.explanationText,
                  { color: isCorrectAnswer ? "#14532d" : "#0c4a6e" },
                ]}
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
  // ── Error states ────────────────────────────────────────────────────────
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  errorIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  errorBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  errorBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  errorBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },

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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 0,
  },
  counterCurrent: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  counterTotal: { fontSize: 12, fontFamily: "Inter_500Medium" },

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
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.6,
    lineHeight: 30,
    marginBottom: 24,
  },

  imageWrap: { marginBottom: 20 },
  options: { gap: 10, marginBottom: 20 },

  // ── Explanation ─────────────────────────────────────────────────────────
  explanationBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 10,
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
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    borderRadius: 18,
    gap: 8,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
});
