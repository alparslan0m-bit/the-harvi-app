// Extracted from hooks/useQuiz.ts — pure business logic for quiz answer resolution.
// No React dependencies.

// ── Schema field-name candidates ────────────────────────────────────────────

export const TEXT_CANDIDATES = [
  "text", "question", "body", "content", "question_text", "stem",
];
export const OPTIONS_CANDIDATES = ["options", "answers", "choices", "opts"];
export const ANSWER_CANDIDATES = [
  "answer", "correct_answer", "correct", "answer_index",
  "correct_index", "correct_answer_index",
];
export const EXPLANATION_CANDIDATES = [
  "explanation", "rationale", "reason", "feedback", "solution", "comment",
];

export const IMAGE_URL_CANDIDATES = [
  "image_url", "image", "picture_url", "photo_url",
  "img_url", "image_link", "img", "media_url",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

export function str(v: unknown): string {
  return String(v ?? "");
}

export function pick(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const c of candidates) if (c in row) return row[c];
  return null;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i];
    a[i] = a[j] as T;
    a[j] = temp as T;
  }
  return a;
}

export function extractOptionText(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "number") return String(item);
  if (item !== null && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const val =
      obj["text"] ??
      obj["option"] ??
      obj["value"] ??
      obj["label"] ??
      obj["content"] ??
      obj["name"] ??
      obj["body"];
    if (val !== undefined) return str(val);
    const firstStr = Object.values(obj).find((v) => typeof v === "string");
    if (firstStr !== undefined) return str(firstStr);
    return JSON.stringify(item);
  }
  return str(item);
}

export function parseOptions(raw: unknown): string[] {
  if (!raw) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        arr = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        arr = Object.entries(parsed)
          .filter(([k]) => !['answer', 'correct', 'explanation', 'id'].includes(k.toLowerCase()))
          .map(([k, v]) => v);
      } else {
        return [raw];
      }
    } catch {
      return [raw];
    }
  } else if (typeof raw === "object" && raw !== null) {
    arr = Object.entries(raw as Record<string, unknown>)
      .filter(([k]) => !['answer', 'correct', 'explanation', 'id'].includes(k.toLowerCase()))
      .map(([k, v]) => v);
  }
  
  const mapped = arr.map(extractOptionText).filter(Boolean);
  return Array.from(new Set(mapped));
}

/**
 * Resolves the correct option index (0-based) from whatever the DB stores.
 *
 * Handles every common format:
 *  • 1-based integer  (1, 2, 3, 4)
 *  • 0-based integer  (0, 1, 2, 3)
 *  • Letter           ("A", "B", "C", "D")
 *  • Full option text  ("عضلة الحجاب الحاز (Diaphragm)")  ← was broken before
 *  • Numeric string   ("2", "3")
 */
export function resolveAnswerIndex(rawAnswer: unknown, options: string[]): number {
  const n = options.length;
  if (!rawAnswer) return 0;

  if (typeof rawAnswer === "string") {
    const trimmed = rawAnswer.trim();
    const lower = trimmed.toLowerCase();

    // 1. EXACT TEXT MATCH (Most reliable)
    const exact = options.findIndex((o) => o.trim().toLowerCase() === lower);
    if (exact !== -1) return exact;

    // 2. Numeric string → convert and handle below
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== "") {
      // DB has a constraint enforcing 0-based indexing, so we trust it as-is
      if (num >= 0 && num < n) return num;
      // If it's equal to N, it might be a legacy 1-based answer, so we correct it
      if (num === n) return n - 1;
    }

    // 3. Single letter detection (A, B, C, D)
    if (trimmed.length === 1) {
      const charCode = trimmed.toUpperCase().charCodeAt(0);
      if (charCode >= 65 && charCode < 65 + n) return charCode - 65;

      const arabicMap: Record<string, number> = {
        أ: 0,
        ب: 1,
        ج: 2,
        د: 3,
        ا: 0,
      };
      const val = arabicMap[trimmed];
      if (val !== undefined && val < n) return val;
    }

    // 4. Substring matching (Last resort — only if exactly ONE option matches)
    const containedMatches = options
      .map((o, i) => ({ i, text: o.trim().toLowerCase() }))
      .filter(({ text }) => lower.includes(text) && text.length > 5);
    if (containedMatches.length === 1) {
      const match = containedMatches[0];
      if (match) return match.i;
    }

    const subMatches = options
      .map((o, i) => ({ i, text: o.trim().toLowerCase() }))
      .filter(({ text }) => text.includes(lower) && lower.length > 5);
    if (subMatches.length === 1) {
      const match = subMatches[0];
      if (match) return match.i;
    }
  }

  if (typeof rawAnswer === "number") {
    // DB has a constraint enforcing 0-based indexing, so we trust it as-is
    if (rawAnswer >= 0 && rawAnswer < n) return rawAnswer;
    // If it's equal to N, it might be a legacy 1-based answer, so we correct it
    if (rawAnswer === n) return n - 1;
  }

  return 0;
}

export function resolveAnswer(
  row: Record<string, unknown>,
  options: string[],
): { answer: number; explanation: string } {
  const rawAnswer = pick(row, ANSWER_CANDIDATES);
  const explanation = str(pick(row, EXPLANATION_CANDIDATES) ?? "");
  const answerIndex = resolveAnswerIndex(rawAnswer, options);
  return { answer: answerIndex, explanation };
}

export function shuffleOptions(
  options: string[],
  correctIndex: number,
): { options: string[]; correctIndex: number } {
  const tagged = options.map((opt, i) => ({
    opt,
    correct: i === correctIndex,
  }));
  const shuffled = shuffle(tagged);
  return {
    options: shuffled.map((x) => x.opt),
    correctIndex: shuffled.findIndex((x) => x.correct),
  };
}
