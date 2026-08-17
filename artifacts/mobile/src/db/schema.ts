/**
 * @file schema.ts
 * @description Drizzle SQLite schema for Harvi's on-device relational layer.
 * All tables are keyed by stable server IDs. Zod shapes in
 * `src/shared/types/schemas.ts` remain the source of truth for payload
 * validation at the boundaries; this module defines physical storage only.
 *
 * Driver note: the catalog-pinned stable `drizzle-orm@0.45.2` ships the sync
 * driver (`drizzle-orm/expo-sqlite`). `sqliteTable` itself is driver-agnostic,
 * so swapping to the async driver later is a `client.ts` change only
 * (see plan.md §2 decision #6).
 */
import { sqliteTable, index, integer, text, primaryKey, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Content / hierarchy — replaces `harvi:hierarchy`.
 */
export const hierarchyYears = sqliteTable("hierarchy_years", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
});

export const hierarchyModules = sqliteTable(
  "hierarchy_modules",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    yearId: text("year_id")
      .notNull()
      .references(() => hierarchyYears.id),
    order: integer("order").notNull(),
    externalPriceId: text("external_price_id"),
  },
  (t) => [index("hierarchy_modules_year_id_idx").on(t.yearId)],
);

export const hierarchySubjects = sqliteTable(
  "hierarchy_subjects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    moduleId: text("module_id")
      .notNull()
      .references(() => hierarchyModules.id),
    order: integer("order").notNull(),
  },
  (t) => [index("hierarchy_subjects_module_id_idx").on(t.moduleId)],
);

export const hierarchyLectures = sqliteTable(
  "hierarchy_lectures",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    externalId: text("external_id").notNull(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => hierarchySubjects.id),
    questionCount: integer("question_count"),
    isFree: integer("is_free", { mode: "boolean" }),
  },
  (t) => [index("hierarchy_lectures_subject_id_idx").on(t.subjectId)],
);

/**
 * Question content — replaces `harvi:qcache:<lectureId>`.
 * `options` is a JSON string validated by `QuestionSchema.options` at the
 * boundary. No FTS5 table — search is out of scope (§4).
 */
export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    lectureId: text("lecture_id").notNull(),
    text: text("text").notNull(),
    options: text("options").notNull(),
    answer: integer("answer").notNull(),
    explanation: text("explanation").notNull().default(""),
    imageUrl: text("image_url"),
    downloadedAt: text("downloaded_at").notNull(),
  },
  (t) => [index("questions_lecture_id_idx").on(t.lectureId)],
);

/**
 * Progress & best scores — replace `harvi:progress:<uid>`, `harvi:bestScores:<uid>`.
 */
export const progress = sqliteTable(
  "progress",
  {
    userId: text("user_id").notNull(),
    lectureId: text("lecture_id").notNull(),
    completedAt: text("completed_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lectureId] })],
);

export const bestScores = sqliteTable(
  "best_scores",
  {
    userId: text("user_id").notNull(),
    lectureId: text("lecture_id").notNull(),
    score: integer("score").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lectureId] })],
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    userId: text("user_id").notNull(),
    questionId: text("question_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.questionId] }),
    index("bookmarks_user_id_idx").on(t.userId),
  ],
);

/**
 * Quiz results + offline queue — replaces `harvi:quiz_queue`.
 * `status` drives the offline sync engine: `'pending'` rows await upload,
 * `'synced'` rows are retained for local history then purged after 30 days.
 */
export const quizResults = sqliteTable(
  "quiz_results",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    lectureId: text("lecture_id").notNull(),
    lectureName: text("lecture_name").notNull(),
    score: integer("score").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    correctAnswers: integer("correct_answers").notNull(),
    createdAt: text("created_at").notNull(),
    status: text("status").notNull().default("pending"),
    syncedAt: text("synced_at"),
  },
  (t) => [
    index("quiz_results_status_created_at_idx").on(t.status, t.createdAt),
    index("quiz_results_user_id_idx").on(t.userId),
    check("quiz_results_status_check", sql`${t.status} IN ('pending','synced')`),
  ],
);

/**
 * User aggregates & entitlements — replace `harvi:stats:<uid>`,
 * `harvi:access:<uid>`, `harvi:purchases:<uid>`.
 */
export const userStats = sqliteTable("user_stats", {
  userId: text("user_id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const accessMap = sqliteTable(
  "access_map",
  {
    userId: text("user_id").notNull(),
    itemId: text("item_id").notNull(),
    itemType: text("item_type").notNull(),
    hasAccess: integer("has_access", { mode: "boolean" }).notNull(),
    isFree: integer("is_free", { mode: "boolean" }).notNull(),
    priceCents: integer("price_cents").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemId] }),
    check("access_map_item_type_check", sql`${t.itemType} IN ('module','subject')`),
  ],
);

export const purchases = sqliteTable(
  "purchases",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    moduleId: text("module_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("purchases_user_id_idx").on(t.userId)],
);

/**
 * Bookkeeping — new.
 * `question_cache_version` → preserves the existing CACHE_VERSION gate.
 * No `db_schema_version` key — Drizzle tracks applied migrations in its own
 * journal (`__drizzle_migrations`); a second hand-maintained version would
 * only invite drift.
 */
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
