import { z } from "zod";

export const ModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  year_id: z.string(),
  order: z.number(),
  external_price_id: z.string().nullable().optional(),
});
export type Module = z.infer<typeof ModuleSchema> & { subjects: Subject[] };

export const LectureSchema = z.object({
  id: z.string(),
  name: z.string(),
  external_id: z.string(),
  subject_id: z.string(),
  question_count: z.number().optional(),
  is_free: z.boolean().optional(),
});
export type Lecture = z.infer<typeof LectureSchema>;

export const SubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  module_id: z.string(),
  order: z.number(),
});
export type Subject = z.infer<typeof SubjectSchema> & { lectures: Lecture[] };

export const YearSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
});
export type Year = z.infer<typeof YearSchema> & { modules: Module[] };

// Add nested properties post-declaration for recursive/nested structures
export const SubjectWithLecturesSchema = SubjectSchema.extend({
  lectures: z.array(LectureSchema).default([]),
});

export const ModuleWithSubjectsSchema = ModuleSchema.extend({
  subjects: z.array(SubjectWithLecturesSchema).default([]),
});

export const YearWithModulesSchema = YearSchema.extend({
  modules: z.array(ModuleWithSubjectsSchema).default([]),
});

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.array(z.string()),
  answer: z.number(),
  explanation: z.string().default(""),
  image_url: z.string().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const AnsweredStateSchema = z.object({
  selected: z.number(),
  correct: z.number(),
  explanation: z.string(),
});
export type AnsweredState = z.infer<typeof AnsweredStateSchema>;

export const HistoryItemSchema = z.object({
  question: QuestionSchema,
  selected: z.number(),
  correct: z.number(),
  explanation: z.string(),
});
export type HistoryItem = z.infer<typeof HistoryItemSchema>;

export const QuizResultSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  lecture_id: z.string(),
  lecture_name: z.string(),
  score: z.number(),
  total_questions: z.number(),
  correct_answers: z.number(),
  created_at: z.string(),
});
export type QuizResult = z.infer<typeof QuizResultSchema>;

export const UserStatsSchema = z.object({
  total_quizzes: z.number(),
  total_questions: z.number(),
  average_score: z.number(),
  best_score: z.number(),
  streak: z.number(),
  weekly_activity: z.array(z.object({
    day: z.string(),
    count: z.number(),
    isToday: z.boolean().optional(),
  })),
  subject_mastery: z.array(z.object({
    subject: z.string(),
    mastery: z.number(),
    attempts: z.number(),
  })),
  recent_results: z.array(QuizResultSchema),
});
export type UserStats = z.infer<typeof UserStatsSchema>;

export const ContentAccessEntrySchema = z.object({
  item_id: z.string(),
  item_type: z.enum(['module', 'subject']),
  has_access: z.boolean(),
  is_free: z.boolean(),
  price_cents: z.number(),
});
export type ContentAccessEntry = z.infer<typeof ContentAccessEntrySchema>;

export const PurchaseSchema = z.object({
  id: z.string(),
  module_id: z.string().nullable(),
  amount_cents: z.number(),
  currency: z.string(),
  status: z.string(),
  created_at: z.string(),
});
export type Purchase = z.infer<typeof PurchaseSchema>;

export const PendingQuizResultSchema = z.object({
  localId: z.string(),
  userId: z.string(),
  lectureId: z.string(),
  score: z.number(),
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  createdAt: z.string(),
});
export type PendingQuizResult = z.infer<typeof PendingQuizResultSchema>;

export const CachedLectureSchema = z.object({
  questions: z.array(QuestionSchema),
  questionCount: z.number(),
  downloadedAt: z.string(),
  version: z.string().optional(),
});
export type CachedLecture = z.infer<typeof CachedLectureSchema>;
