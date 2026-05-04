import { useQuery } from "@tanstack/react-query";

import { decryptAnswer, safeBtoa } from "@/lib/crypto";
import { loadQuestionsFromCache, saveQuestionsToCache } from "@/lib/questionCache";
import { supabase } from "@/lib/supabase";
import { Question } from "@/types";

const LECTURE_FK_CANDIDATES = [
  "lecture_id", "subject_id", "topic_id", "lesson_id", "lec_id", "content_id", "parent_id",
];
const TEXT_CANDIDATES = ["text", "question", "body", "content", "question_text", "stem"];
const OPTIONS_CANDIDATES = ["options", "answers", "choices", "opts"];
const ANSWER_CANDIDATES = ["answer", "correct_answer", "correct", "answer_index", "correct_index", "correct_answer_index"];
const EXPLANATION_CANDIDATES = ["explanation", "rationale", "reason", "feedback", "solution", "comment"];
const SECURE_CANDIDATES = ["secure", "encrypted", "encrypted_answer"];
const IMAGE_URL_CANDIDATES = ["image_url", "image", "picture_url", "photo_url", "img_url", "image_link", "img", "media_url"];
const XOR_KEY = "harvi-quiz-secure-key-2024";
const QUIZ_CACHE_VERSION = "v2"; // Increment this to force cache clear


function str(v: unknown): string { return String(v ?? ""); }

function pick(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const c of candidates) if (c in row) return row[c];
  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function extractOptionText(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "number") return String(item);
  if (item !== null && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const val = obj.text ?? obj.option ?? obj.value ?? obj.label ?? obj.content ?? obj.name ?? obj.body;
    if (val !== undefined) return str(val);
    const firstStr = Object.values(obj).find((v) => typeof v === "string");
    if (firstStr !== undefined) return str(firstStr);
    return JSON.stringify(item);
  }
  return str(item);
}

function parseOptions(raw: unknown): string[] {
  if (!raw) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try { arr = JSON.parse(raw); } catch { return [raw]; }
  }
  return arr.map(extractOptionText).filter(Boolean);
}

/**
 * Resolves the correct option index (0-based) from whatever the DB stores.
 *
 * Handles every common format:
 *  • 1-based integer  (1, 2, 3, 4)
 *  • 0-based integer  (0, 1, 2, 3)
 *  • Letter           ("A", "B", "C", "D")
 *  • Full option text ("عضلة الحجاب الحاز (Diaphragm)")  ← was broken before
 *  • Numeric string   ("2", "3")
 */
function resolveAnswerIndex(rawAnswer: unknown, options: string[]): number {
  const n = options.length;
  if (!rawAnswer) return 0;

  if (typeof rawAnswer === "string") {
    const trimmed = rawAnswer.trim();
    const lower = trimmed.toLowerCase();

    // 1. EXACT TEXT MATCH (Most reliable)
    const exact = options.findIndex(o => o.trim().toLowerCase() === lower);
    if (exact !== -1) return exact;

    // 2. Numeric string → convert and handle below
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== "") {
        // If it's N, it must be 1-based (since 0-based only goes to N-1)
        if (num === n) return n - 1;
        // TRUST 0-BASED FIRST: If it's within 0..N-1, use it as is
        if (num >= 0 && num < n) return num;
        // Fallback for 1-based (1..N)
        if (num >= 1 && num <= n) return num - 1;
    }

    // 3. Single letter detection (A, B, C, D)
    if (trimmed.length === 1) {
      const charCode = trimmed.toUpperCase().charCodeAt(0);
      if (charCode >= 65 && charCode < 65 + n) return charCode - 65;

      const arabicMap: Record<string, number> = { "أ": 0, "ب": 1, "ج": 2, "د": 3, "ا": 0 };
      if (trimmed in arabicMap && arabicMap[trimmed] < n) return arabicMap[trimmed];
    }

    // 4. Substring matching (Last resort)
    const contained = options.findIndex(o => lower.includes(o.trim().toLowerCase()) && o.trim().length > 5);
    if (contained !== -1) return contained;

    const sub = options.findIndex(o => o.trim().toLowerCase().includes(lower) && lower.length > 5);
    if (sub !== -1) return sub;
  }

  if (typeof rawAnswer === "number") {
    if (rawAnswer === n) return n - 1;
    if (rawAnswer >= 0 && rawAnswer < n) return rawAnswer;
    if (rawAnswer >= 1 && rawAnswer <= n) return rawAnswer - 1;
  }

  return 0;
}

function buildSecure(row: Record<string, unknown>, options: string[]): string {
  const rawSecure = pick(row, SECURE_CANDIDATES);
  const rawAnswer = pick(row, ANSWER_CANDIDATES);
  const explanation = str(pick(row, EXPLANATION_CANDIDATES) ?? "");
  const answerIndex = resolveAnswerIndex(rawAnswer, options);

  if (rawSecure && typeof rawSecure === "string" && rawSecure.length > 0) {
    try {
      const decoded = atob(rawSecure);
      let decrypted = "";
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(
          decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)
        );
      }
      const parsed = JSON.parse(decrypted);
      if (typeof parsed.answer === "number") {
        const resolved = resolveAnswerIndex(parsed.answer, options);
        console.log(`[db] Secure path success: resolved to ${resolved}`);
        return safeBtoa(JSON.stringify({ answer: resolved, explanation: parsed.explanation ?? "" }));
      }
    } catch { /* fall through */ }

    try {
      const parsed = JSON.parse(rawSecure);
      if (typeof parsed.answer === "number") {
        const resolved = resolveAnswerIndex(parsed.answer, options);
        console.log(`[db] JSON path success: resolved to ${resolved}`);
        return safeBtoa(JSON.stringify({ answer: resolved, explanation: parsed.explanation ?? "" }));
      }
    } catch { /* fall through */ }
  }

  return safeBtoa(JSON.stringify({ answer: answerIndex, explanation }));
}

function shuffleOptions(
  options: string[],
  correctIndex: number
): { options: string[]; correctIndex: number } {
  const tagged = options.map((opt, i) => ({ opt, correct: i === correctIndex }));
  const shuffled = shuffle(tagged);
  return {
    options: shuffled.map((x) => x.opt),
    correctIndex: shuffled.findIndex((x) => x.correct),
  };
}

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
      throw new Error(`questions table: ${error.message} (code: ${error.code})`);
    }

    if (data && data.length > 0) {
      console.log(`[fetch] questions matched FK column: ${fkCol} for ID: ${lectureId} (${data.length} items)`);
      const raw: Question[] = data.map((row: Record<string, unknown>, i: number) => {
        const options = parseOptions(pick(row, OPTIONS_CANDIDATES));
        const imageUrl = str(pick(row, IMAGE_URL_CANDIDATES) ?? "").trim();
        return {
          id: str(row.id ?? i),
          text: str(pick(row, TEXT_CANDIDATES) ?? ""),
          options,
          secure: buildSecure(row, options),
          image_url: imageUrl || undefined,
        };
      });

      const shuffledQs = shuffle(raw);

      return shuffledQs.map((q) => {
        try {
          const { answer, explanation } = decryptAnswer(q.secure);
          const { options: newOpts, correctIndex: newCorrect } = shuffleOptions(q.options, answer);
          
          return {
            ...q,
            options: newOpts,
            secure: safeBtoa(JSON.stringify({ answer: newCorrect, explanation })),
          };
        } catch {
          return q;
        }
      });
    }
  }

  return [];
}

export function useQuizQuestions(lectureId: string, initialData?: Question[]) {
  return useQuery({
    queryKey: ["quiz", lectureId, QUIZ_CACHE_VERSION],
    queryFn: async () => {
      try {
        const questions = await fetchQuestions(lectureId);
        // Auto-update the cache on every successful online fetch — keeps the
        // snapshot fresh so users who study online are always ready for offline.
        if (questions.length > 0) {
          saveQuestionsToCache(lectureId, questions); // fire-and-forget
        }
        return questions;
      } catch {
        // Network unavailable — serve from the pre-downloaded cache
        const cached = await loadQuestionsFromCache(lectureId);
        if (cached && cached.questions.length > 0) {
          return cached.questions;
        }
        throw new Error(
          "You're offline and this lecture hasn't been downloaded yet.\n\nDownload the subject while online to take quizzes offline."
        );
      }
    },
    enabled: !!lectureId,
    retry: 0,
    // Keep questions in memory for 5 min — navigating back to the same
    // lecture within a session skips the loading screen entirely.
    gcTime: 5 * 60 * 1000,
    staleTime: 0,
    networkMode: "offlineFirst",
    // Pre-populated from AsyncStorage before query resolves → instant open
    initialData: initialData && initialData.length > 0 ? initialData : undefined,
    // Treat as stale so a fresh fetch still happens in the background
    initialDataUpdatedAt: 0,
  });
}