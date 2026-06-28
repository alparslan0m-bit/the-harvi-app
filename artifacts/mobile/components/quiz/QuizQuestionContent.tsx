import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { OptionButton } from "../ui/OptionButton";
import { QuizImage } from "./QuizImage";
import { Question, AnsweredState } from "@/types";
import { ThemeColors } from "@/hooks/useColors";
import { EdgeInsets } from "react-native-safe-area-context";

interface QuizQuestionContentProps {
  question: Question;
  currentIndex: number;
  answered: AnsweredState | null;
  isCorrectAnswer: boolean;
  colors: ThemeColors;
  onSelect: (index: number) => void;
  insets: EdgeInsets;
}

export function QuizQuestionContent({
  question,
  currentIndex,
  answered,
  isCorrectAnswer,
  colors,
  onSelect,
  insets,
}: QuizQuestionContentProps) {
  return (
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
          {question.options.map((opt: string, i: number) => (
            <OptionButton
              key={i}
              text={opt}
              index={i}
              answered={answered}
              onSelect={onSelect}
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
  );
}

const styles = StyleSheet.create({
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
});
