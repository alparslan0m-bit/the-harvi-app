/**
 * @file questionService.ts
 * @description Fetches quiz questions from Supabase and applies runtime transformations.
 * Implements dynamic foreign key detection to support fluid schema migrations,
 * and shuffles options and question order securely before presenting them to the UI.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "@/src/shared/services/supabase";
import { isDeviceOnline } from "@/src/shared/utils/netInfo";
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

// Cache the known foreign key column in memory and disk to avoid 
// re-running the waterfall detection loop on subsequent fetches.
let knownFkCol: string | null = null;
AsyncStorage.getItem("harvi:quiz:fkcol").then((val) => {
  if (val) knownFkCol = val;
});

/**
 * Fetches, normalizes, and shuffles questions for a given lecture.
 * 
 * If the exact foreign key column for the `questions` table is unknown, this function
 * attempts to guess it by iterating through `LECTURE_FK_CANDIDATES` until it finds
 * a matching schema structure.
 * 
 * Note: This function is exported so `useSubjectCache` can call it directly to pre-populate 
 * the question cache for all lectures in a subject when a user clicks "Download for offline".
 * 
 * @param lectureId - The UUID or external ID of the lecture to fetch questions for
 * @returns A Promise resolving to a shuffled array of normalized Question objects
 * @throws {Error} If the device is offline or if the Supabase query completely fails
 */
export async function fetchQuestions(lectureId: string): Promise<Question[]> {
  const net = await NetInfo.fetch();
  if (!isDeviceOnline(net)) {
    throw new Error("You are offline.");
  }

  const candidates = knownFkCol ? [knownFkCol] : LECTURE_FK_CANDIDATES;

  for (const fkCol of candidates) {
    const queryPromise = supabase
      .from("questions")
      .select("*")
      .eq(fkCol, lectureId);

    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 6000),
    );

    let data, error;
    try {
      const result = await Promise.race([queryPromise, timeoutPromise]);
      data = result.data;
      error = result.error;
    } catch (e) {
      error = e;
    }

    if (error) {
      // 42703: Undefined column. 22P02: Invalid text representation (UUID mismatch).
      // Both imply we guessed the wrong FK column or type, so try the next one.
      if (error.code === "42703" || error.code === "22P02") continue;
      
      throw new Error(
        `questions table: ${error.message} (code: ${error.code})`,
      );
    }

    // If we reach here without an error, we found the correct column!
    if (!knownFkCol) {
      knownFkCol = fkCol;
      AsyncStorage.setItem("harvi:quiz:fkcol", fkCol).catch(() => {});
    }

    if (data && data.length > 0) {
      // Normalize raw rows into strongly-typed Question objects
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

      // Shuffle the order of the questions
      const shuffledQs = shuffle(raw);

      // Shuffle the options inside each question, ensuring the 'answer' index stays accurate
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

    // If data is empty but there's no error, the column exists but this lecture has 0 questions.
    // We return immediately instead of trying the other fallback columns.
    return [];
  }

  return [];
}
