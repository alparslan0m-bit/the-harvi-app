import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useSyncStatus } from "@/context/SyncContext";
import { useQuizQuestions } from "@/hooks/useQuiz";
import { optimisticallyMarkComplete } from "@/hooks/useProgress";
import { decryptAnswer } from "@/lib/crypto";
import { loadQuestionsFromCache } from "@/lib/questionCache";
import { enqueueQuizResult } from "@/lib/offlineQueue";
import { supabase } from "@/lib/supabase";
import { AnsweredState, HistoryItem, Question } from "@/types";

export function useQuizSession(lectureId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline, refreshCount } = useSyncStatus();

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
  const isSubmittingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Animated progress bar width
  const progressAnim = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%` as `${number}%`,
  }));

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (selectedIndex: number) => {
      if (!questions || answered) return;
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
    if (!questions || isSubmittingRef.current || finished) return;
    const isLast = currentIndex === questions.length - 1;

    if (isLast) {
      isSubmittingRef.current = true;
      setFinished(true);
      setSubmitting(true);
      setSaveError(null);
      setSavedOffline(false);

      const score = Math.round((correctCount / questions.length) * 100);
      const now = new Date().toISOString();

      try {
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
          refreshCount();
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
            if (__DEV__) {
              console.error(
                "[QuizScreen] Online insert FAILED, falling back to queue:",
                JSON.stringify(insertErr),
              );
            }
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
            refreshCount();
          }
        }
      } finally {
        queryClient.invalidateQueries({ queryKey: ["progress"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        setSubmitting(false);
      }
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
    refreshCount,
  ]);

  const handleRetry = useCallback(() => {
    setQuestions(null); // Unlock questions to allow fresh data/shuffle
    setCurrentIndex(0);
    setAnswered(null);
    setCorrectCount(0);
    setFinished(false);
    setSubmitting(false);
    isSubmittingRef.current = false;
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

  return {
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
  };
}
