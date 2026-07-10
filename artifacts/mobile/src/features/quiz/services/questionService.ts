// Extracted from hooks/useQuiz.ts — Supabase fetch logic and question mapping.

import { supabase } from "@/src/shared/services/supabase";
import { Question } from "@/src/shared/types/schemas";
import {
  IMAGE_URL_CANDIDATES,
  OPTIONS_CANDIDATES,
  parseOptions,
  pick,
  resolveAnswer,
  shuffle,
  shuffleOptions,
  str,
  TEXT_CANDIDATES,
} from "@/src/features/quiz/utils/answerResolver";

const LECTURE_FK_CANDIDATES = [
  "lecture_id",
  "subject_id",
  "topic_id",
  "lesson_id",
  "lec_id",
  "content_id",
  "parent_id",
];

/**
 * Exported so useSubjectCache can call it directly to pre-populate the
 * question cache for all lectures in a subject ("Download for offline").
 */
export async function fetchQuestions(lectureId: string): Promise<Question[]> {
  for (const fkCol of LECTURE_FK_CANDIDATES) {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq(fkCol, lectureId);

    if (error) {
      if (error.code === "42703" || error.code === "22P02") continue;
      throw new Error(
        `questions table: ${error.message} (code: ${error.code})`,
      );
    }

    if (data && data.length > 0) {

      const raw: Question[] = data.map(
        (row: Record<string, unknown>, i: number) => {
          const options = parseOptions(pick(row, OPTIONS_CANDIDATES));
          const imageUrl = str(pick(row, IMAGE_URL_CANDIDATES) ?? "").trim();
          const { answer, explanation } = resolveAnswer(row, options);
          return {
            id: str(row["id"] ?? i),
            text: str(pick(row, TEXT_CANDIDATES) ?? ""),
            options,
            answer,
            explanation,
            image_url: imageUrl || undefined,
          };
        },
      );

      const shuffledQs = shuffle(raw);

      return shuffledQs.map((q) => {
        if (q.answer < 0 || q.answer >= q.options.length) {
          if (__DEV__) {
            console.warn(
              `[quiz] Skipping shuffle for question ${q.id}: invalid answer index ${q.answer}`,
            );
          }
          return q;
        }
        const { options: newOpts, correctIndex: newCorrect } = shuffleOptions(
          q.options,
          q.answer,
        );

        return {
          ...q,
          options: newOpts,
          answer: newCorrect,
        };
      });
    }
  }

  return [];
}
