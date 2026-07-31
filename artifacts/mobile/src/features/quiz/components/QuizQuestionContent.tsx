import React, { useRef, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { OptionButton } from "@/src/shared/components";
import { QuizImage } from "./QuizImage";
import { Question, AnsweredState } from "@/src/shared/types";
import { ThemeColors } from "@/src/shared/hooks/useColors";
import { EdgeInsets } from "react-native-safe-area-context";

interface QuizQuestionContentProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  answered?: AnsweredState | null;
  isCorrectAnswer: boolean;
  colors: ThemeColors;
  onSelect: (index: number) => void;
  insets: EdgeInsets;
}

export function QuizQuestionContent({
  question,
  currentIndex,
  totalQuestions,
  answered,
  isCorrectAnswer,
  colors,
  onSelect,
  insets,
}: QuizQuestionContentProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentIndex]);

  return (
    <ScrollView
      ref={scrollRef}
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
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Question number label */}
        <View style={[styles.qChip, { backgroundColor: colors.muted }]}>
          <Text style={[styles.qChipText, { color: colors.foreground }]}>
            QUESTION {currentIndex + 1} OF {totalQuestions}
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
          {question.options.map((opt: string, i: number) => (
            <OptionButton
              key={i}
              text={opt}
              index={i}
              {...(answered !== undefined ? { answered } : {})}
              onSelect={onSelect}
            />
          ))}
        </View>

        {/* Explanation */}
        {answered &&
          (() => {
            const mintFamily = {
              fill: "#C9F0DE",
              solid: "#4FCB94",
              ink: "#0F5C3C",
            };
            const skyFamily = {
              fill: "#CFE8FA",
              solid: "#5CB8F0",
              ink: "#134A6B",
            };

            const boxFamily = isCorrectAnswer ? mintFamily : skyFamily;

            return (
              <Animated.View
                entering={FadeInUp.duration(320).springify()}
                style={[
                  styles.explanationBox,
                  { backgroundColor: boxFamily.fill },
                ]}
              >
                <View style={styles.explanationHeader}>
                  <View
                    style={[
                      styles.explanationIconBox,
                      { backgroundColor: boxFamily.solid },
                    ]}
                  >
                    <Feather
                      name={isCorrectAnswer ? "check" : "info"}
                      size={14}
                      color="#ffffff"
                    />
                  </View>
                  <Text
                    style={[styles.explanationTitle, { color: boxFamily.ink }]}
                  >
                    Explanation
                  </Text>
                </View>
                <Text
                  style={[styles.explanationText, { color: boxFamily.ink }]}
                >
                  {answered.explanation ||
                    "No explanation available for this question."}
                </Text>
              </Animated.View>
            );
          })()}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  card: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    borderRadius: 32,
    borderWidth: 1.5,
  },

  qChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  qChipText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },

  questionText: {
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 24,
  },

  imageWrap: { marginBottom: 24 },
  options: { gap: 10, marginBottom: 24 },

  explanationBox: {
    padding: 18,
    borderRadius: 28,
    borderWidth: 0,
    gap: 12,
  },
  explanationHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  explanationIconBox: {
    width: 26,
    height: 26,
    borderRadius: 999,
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
});
