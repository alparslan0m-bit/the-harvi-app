export interface Year {
  id: string;
  name: string;
  order: number;
  modules: Module[];
}

export interface Module {
  id: string;
  name: string;
  year_id: string;
  order: number;
  subjects: Subject[];
  external_price_id?: string | null;
}

export interface Subject {
  id: string;
  name: string;
  module_id: string;
  order: number;
  is_free?: boolean;
  external_price_id?: string | null;
  lectures: Lecture[];
}

export interface Lecture {
  id: string;
  name: string;
  external_id: string;
  subject_id: string;
  question_count?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  secure: string;
  /** Optional image URL (anatomy diagram, X-ray, histology slide, etc.) */
  image_url?: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  lecture_id: string;
  lecture_name: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
}

export interface UserStats {
  total_quizzes: number;
  total_questions: number;
  average_score: number;
  best_score: number;
  streak: number;
  weekly_activity: { day: string; count: number; isToday?: boolean }[];
  subject_mastery: { subject: string; mastery: number; attempts: number }[];
  recent_results: QuizResult[];
}

// ── Quiz session types ──────────────────────────────────────────────────────

export interface AnsweredState {
  selected: number;
  correct: number;
  explanation: string;
}

export interface HistoryItem {
  question: Question;
  selected: number;
  correct: number;
  explanation: string;
}
