# Data Dictionary

> **Auto-generated** by `docs/extractors/data-dictionary.js`.
> Generated at 2026-08-14T17:41:49.284Z
> Parses SQL migrations and Zod schemas, then cross-references them for drift.

## ⚠️ Schema Drift Warnings

| Type | Schema | Table | Field |
|------|--------|-------|-------|
| 🔴 Missing in Zod schema | LectureSchema | lectures | `order_index` |
| 🟡 Missing in SQL | YearSchema | years | `order` |
| 🔴 Missing in Zod schema | QuestionSchema | questions | `lecture_id` |
| 🔴 Missing in Zod schema | QuestionSchema | questions | `question_order` |
| 🟡 Missing in SQL | QuizResultSchema | quiz_results | `lecture_name` |
| 🟡 Missing in SQL | UserStatsSchema | user_stats | `total_questions` |
| 🟡 Missing in SQL | UserStatsSchema | user_stats | `day` |
| 🟡 Missing in SQL | UserStatsSchema | user_stats | `count` |
| 🟡 Missing in SQL | UserStatsSchema | user_stats | `isToday` |
| 🔴 Missing in Zod schema | UserStatsSchema | user_stats | `user_id` |
| 🔴 Missing in Zod schema | UserStatsSchema | user_stats | `total_questions_answered` |
| 🔴 Missing in Zod schema | UserStatsSchema | user_stats | `correct_answers` |
| 🔴 Missing in Zod schema | UserStatsSchema | user_stats | `current_streak` |
| 🔴 Missing in Zod schema | UserStatsSchema | user_stats | `longest_streak` |
| 🔴 Missing in Zod schema | UserStatsSchema | user_stats | `last_quiz_date` |
| 🔴 Missing in Zod schema | PurchaseSchema | purchases | `user_id` |
| 🔴 Missing in Zod schema | PurchaseSchema | purchases | `payment_id` |
| 🔴 Missing in Zod schema | PurchaseSchema | purchases | `payment_session_id` |
| 🔴 Missing in Zod schema | PurchaseSchema | purchases | `provider` |
| 🔴 Missing in Zod schema | PurchaseSchema | purchases | `store_transaction_id` |

## 📦 Tables

### years
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | uuid_generate_v4() | — | — |
| `name` | TEXT |  | ✅ | — | — | — |
| `external_id` | TEXT |  | ✅ | — | — | — |
| `created_at` | TIMESTAMPTZ |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ |  |  | now() | — | — |

**Constraints:** `unique_year_name`

### modules
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | uuid_generate_v4() | — | — |
| `year_id` | UUID |  | ✅ | — | → years.id | — |
| `name` | TEXT |  | ✅ | — | — | — |
| `external_id` | TEXT |  | ✅ | — | — | — |
| `order_index` | INTEGER |  |  | 0 | — | — |
| `price_cents` | INTEGER |  | ✅ | 0 | — | — |
| `external_price_id` | TEXT |  |  | — | — | — |
| `created_at` | TIMESTAMPTZ |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ |  |  | now() | — | — |

**Constraints:** `unique_module_per_year`

### subjects
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | uuid_generate_v4() | — | — |
| `module_id` | UUID |  | ✅ | — | → modules.id | — |
| `name` | TEXT |  | ✅ | — | — | — |
| `external_id` | TEXT |  | ✅ | — | — | — |
| `order_index` | INTEGER |  |  | 0 | — | — |
| `created_at` | TIMESTAMPTZ |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ |  |  | now() | — | — |

**Constraints:** `unique_subject_per_module`

### lectures
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | uuid_generate_v4() | — | — |
| `subject_id` | UUID |  | ✅ | — | → subjects.id | — |
| `name` | TEXT |  | ✅ | — | — | — |
| `external_id` | TEXT |  | ✅ | — | — | — |
| `order_index` | INTEGER |  |  | 0 | — | — |
| `is_free` | BOOLEAN |  |  | false | — | — |
| `created_at` | TIMESTAMPTZ |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ |  |  | now() | — | — |

**Constraints:** `unique_lecture_per_subject`

### questions
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | uuid_generate_v4() | — | — |
| `lecture_id` | UUID |  | ✅ | — | → lectures.id | — |
| `text` | TEXT |  | ✅ | — | — | — |
| `image_url` | TEXT |  |  | — | — | — |
| `options` | JSONB |  | ✅ | — | — | — |
| `correct_answer_index` | INTEGER |  | ✅ | — | — | — |
| `explanation` | TEXT |  |  | — | — | — |
| `question_order` | INTEGER |  |  | 0 | — | — |
| `created_at` | TIMESTAMPTZ |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ |  |  | now() | — | — |


### profiles
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | — | → auth.users.id | — |
| `full_name` | TEXT |  |  | — | — | — |
| `avatar_url` | TEXT |  |  | — | — | — |
| `bio` | TEXT |  |  | — | — | — |
| `updated_at` | TIMESTAMPTZ |  |  | now() | — | — |


### user_stats
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `user_id` | UUID | ✅ | ✅ | — | → auth.users.id | — |
| `total_quizzes` | INTEGER |  | ✅ | 0 | — | — |
| `total_questions_answered` | INTEGER |  | ✅ | 0 | — | — |
| `correct_answers` | INTEGER |  | ✅ | 0 | — | — |
| `average_score` | NUMERIC(5,2) |  | ✅ | 0.00 | — | — |
| `best_score` | INTEGER |  | ✅ | 0 | — | — |
| `current_streak` | INTEGER |  | ✅ | 0 | — | — |
| `longest_streak` | INTEGER |  | ✅ | 0 | — | — |
| `last_quiz_date` | DATE |  |  | — | — | — |
| `updated_at` | TIMESTAMPTZ |  |  | now() | — | — |


### quiz_results
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | uuid_generate_v4() | — | — |
| `user_id` | UUID |  | ✅ | — | → auth.users.id | — |
| `lecture_id` | UUID |  | ✅ | — | → lectures.id | — |
| `score` | INTEGER |  | ✅ | — | — | score >= 0 AND score <= 100 |
| `total_questions` | INTEGER |  | ✅ | — | — | total_questions > 0 |
| `correct_answers` | INTEGER |  | ✅ | — | — | correct_answers >= 0 AND correct_answers <= total_questions |
| `created_at` | TIMESTAMPTZ |  |  | now() | — | — |

**Constraints:** `check_score_formula`

### feedback
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | gen_random_uuid() | — | — |
| `user_id` | UUID |  |  | — | → auth.users.id | — |
| `content` | TEXT |  | ✅ | — | — | char_length(content) > 0 AND char_length(content) < 10000 |
| `metadata` | JSONB |  |  | '{}'::jsonb | — | — |
| `status` | TEXT |  |  | 'new' | — | status IN ('new', 'read', 'resolved', 'archived') |
| `created_at` | TIMESTAMPTZ |  |  | now() | — | — |


### lecture_statistics
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | gen_random_uuid() | — | — |
| `lecture_id` | UUID |  | ✅ | — | → lectures.id | — |
| `unique_students` | INTEGER |  |  | 0 | — | — |
| `total_attempts` | INTEGER |  |  | 0 | — | — |
| `average_score` | NUMERIC(5,2) |  |  | 0.00 | — | — |
| `last_updated` | TIMESTAMPTZ |  |  | now() | — | — |


### purchases
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | gen_random_uuid() | — | — |
| `user_id` | UUID |  | ✅ | — | → auth.users.id | — |
| `module_id` | UUID |  |  | — | → modules.id | — |
| `status` | TEXT |  | ✅ | — | — | status IN ('pending', 'active', 'failed', 'refunded', 'disputed') |
| `amount_cents` | INTEGER |  | ✅ | — | — | amount_cents >= 0 |
| `currency` | TEXT |  | ✅ | 'usd' | — | — |
| `payment_id` | TEXT NULL |  |  | — | — | — |
| `payment_session_id` | TEXT NULL |  |  | — | — | — |
| `provider` | TEXT |  | ✅ | 'manual' | — | — |
| `created_at` | TIMESTAMPTZ |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ |  |  | now() | — | — |
| `store_transaction_id` | TEXT |  |  | — | — | — |

**Constraints:** `check_purchase_has_module`

### access_codes
_Source: `20260627000001_access_codes.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID | ✅ | ✅ | gen_random_uuid() | — | — |
| `code` | TEXT |  | ✅ | — | — | — |
| `module_id` | UUID |  | ✅ | — | → modules.id | — |
| `batch_id` | TEXT |  |  | — | — | — |
| `redeemed_by` | UUID |  |  | — | → auth.users.id | — |
| `redeemed_at` | TIMESTAMPTZ |  |  | — | — | — |
| `expires_at` | TIMESTAMPTZ |  |  | — | — | — |
| `created_at` | TIMESTAMPTZ |  |  | now() | — | — |


## 🔧 RPCs & Functions

| Function | Params | Returns | Source |
|----------|--------|---------|--------|
| `get_user_streak` | user_uuid UUID | INTEGER | 20260401000000_harvi_master_baseline.sql |
| `decay_stale_streaks` | — | void | 20260401000000_harvi_master_baseline.sql |
| `get_admin_dashboard_stats` | — | JSONB | 20260401000000_harvi_master_baseline.sql |
| `get_user_aggregate_stats` | user_uuid UUID | TABLE(total_quizzes BIGINT, total_questions BIGINT, total_correct BIGINT, best_score INTEGER) | 20260401000000_harvi_master_baseline.sql |
| `get_active_users_today` | — | INTEGER | 20260401000000_harvi_master_baseline.sql |
| `get_analytics_summary` | p_days INTEGER DEFAULT 30 | JSON | 20260401000000_harvi_master_baseline.sql |
| `get_recent_activity` | — | JSON | 20260401000000_harvi_master_baseline.sql |
| `is_admin` | — | BOOLEAN | 20260510000001_unified_rls_policies.sql |
| `check_content_access` | p_lecture_id UUID | BOOLEAN | 20260510000001_unified_rls_policies.sql |
| `get_content_access_map` | — | TABLE (item_id UUID, item_type TEXT, has_access BOOLEAN, is_free BOOLEAN, price_cents INTEGER) | 20260510000001_unified_rls_policies.sql |
| `redeem_access_code` | p_code TEXT | JSONB | 20260627000001_access_codes.sql |
| `admin_generate_codes` | p_target_id UUID,         -- the module UUID
    p_count INTEGER,          -- how many codes to generate
    p_expires_days INTEGER DEFAULT NULL -- optional: days until expiry | TABLE (code TEXT) | 20260627000001_access_codes.sql |
| `get_user_stats_overview` | p_user_id UUID | JSON | 20260802000001_stats_overview_rpc.sql |

## ⚡ Triggers

| Trigger | Timing | Event | Table | Calls |
|---------|--------|-------|-------|-------|
| `on_auth_user_created` | AFTER | INSERT | auth.users | handle_new_user() |
| `tr_sync_lecture_stats` | AFTER | INSERT | quiz_results | sync_lecture_stats() |
| `tr_sync_user_stats` | AFTER | INSERT | quiz_results | sync_user_stats() |
| `tr_sync_user_stats_on_delete` | AFTER | DELETE | quiz_results | sync_user_stats_on_delete() |
| `tr_sync_lecture_stats_on_delete` | AFTER | DELETE | quiz_results | sync_lecture_stats_on_delete() |
| `tr_update_years_updated_at` | BEFORE | UPDATE | years | update_updated_at_column() |
| `tr_update_modules_updated_at` | BEFORE | UPDATE | modules | update_updated_at_column() |
| `tr_update_subjects_updated_at` | BEFORE | UPDATE | subjects | update_updated_at_column() |
| `tr_update_lectures_updated_at` | BEFORE | UPDATE | lectures | update_updated_at_column() |
| `tr_update_questions_updated_at` | BEFORE | UPDATE | questions | update_updated_at_column() |
| `tr_update_profiles_updated_at` | BEFORE | UPDATE | profiles | update_updated_at_column() |
| `tr_update_user_stats_updated_at` | BEFORE | UPDATE | user_stats | update_updated_at_column() |

## 📇 Indexes

| Index | Table | Columns |
|-------|-------|---------|
| `idx_quiz_results_user_date` | quiz_results | user_id, created_at DESC |
| `idx_questions_lecture_order` | questions | lecture_id, question_order |
| `idx_purchases_user_id` | purchases | user_id |
| `idx_lecture_stats_lecture` | lecture_statistics | lecture_id |
| `idx_feedback_status` | feedback | status |
| `idx_feedback_user_id` | feedback | user_id |
| `idx_quiz_results_user_lecture` | quiz_results | user_id, lecture_id |
| `idx_user_stats_user_id` | user_stats | user_id |
| `idx_user_stats_average_score` | user_stats | average_score DESC |
| `idx_purchases_user_module_status` | purchases | user_id, module_id, status |
| `idx_modules_year_id` | modules | year_id |
| `idx_subjects_module_id` | subjects | module_id |
| `idx_lectures_subject_id` | lectures | subject_id |
| `idx_access_codes_code` | access_codes | code |
| `idx_access_codes_batch` | access_codes | batch_id |
| `idx_access_codes_redeemed_by` | access_codes | redeemed_by |
| `idx_purchases_store_transaction` | purchases | store_transaction_id |

## ⏰ Cron Jobs

| Name | Schedule |
|------|----------|
| `harvi-weekly-cleanup` | `0 3 * * 0` |
| `decay-stale-streaks` | `0 0 * * *` |

## 🛡️ Zod Schemas (Client-Side Validation)

### ModuleSchema → `modules`

| Field | Zod Type |
|-------|----------|
| `id` | `z.string()` |
| `name` | `z.string()` |
| `year_id` | `z.string()` |
| `order` | `z.number()` |
| `external_price_id` | `z.string().nullable().optional()` |

### LectureSchema → `lectures`

| Field | Zod Type |
|-------|----------|
| `id` | `z.string()` |
| `name` | `z.string()` |
| `external_id` | `z.string()` |
| `subject_id` | `z.string()` |
| `question_count` | `z.number().optional()` |
| `is_free` | `z.boolean().optional()` |

### SubjectSchema → `subjects`

| Field | Zod Type |
|-------|----------|
| `id` | `z.string()` |
| `name` | `z.string()` |
| `module_id` | `z.string()` |
| `order` | `z.number()` |

### YearSchema → `years`

| Field | Zod Type |
|-------|----------|
| `id` | `z.string()` |
| `name` | `z.string()` |
| `order` | `z.number()` |

### QuestionSchema → `questions`

| Field | Zod Type |
|-------|----------|
| `id` | `z.string()` |
| `text` | `z.string()` |
| `options` | `z.array(z.string())` |
| `answer` | `z.number()` |
| `explanation` | `z.string().default("")` |
| `image_url` | `z.string().optional()` |

### AnsweredStateSchema _(client-only)_

| Field | Zod Type |
|-------|----------|
| `selected` | `z.number()` |
| `correct` | `z.number()` |
| `explanation` | `z.string()` |

### HistoryItemSchema _(client-only)_

| Field | Zod Type |
|-------|----------|
| `selected` | `z.number()` |
| `correct` | `z.number()` |
| `explanation` | `z.string()` |

### QuizResultSchema → `quiz_results`

| Field | Zod Type |
|-------|----------|
| `id` | `z.string()` |
| `user_id` | `z.string()` |
| `lecture_id` | `z.string()` |
| `lecture_name` | `z.string()` |
| `score` | `z.number()` |
| `total_questions` | `z.number()` |
| `correct_answers` | `z.number()` |
| `created_at` | `z.string()` |

### UserStatsSchema → `user_stats`

| Field | Zod Type |
|-------|----------|
| `total_quizzes` | `z.number()` |
| `total_questions` | `z.number()` |
| `average_score` | `z.number()` |
| `best_score` | `z.number()` |
| `streak` | `z.number()` |
| `weekly_activity` | `z.array( z.object({` |
| `day` | `z.string()` |
| `count` | `z.number()` |
| `isToday` | `z.boolean().optional()` |

### ContentAccessEntrySchema _(client-only)_

| Field | Zod Type |
|-------|----------|
| `item_id` | `z.string()` |
| `item_type` | `z.enum(["module", "subject"])` |
| `has_access` | `z.boolean()` |
| `is_free` | `z.boolean()` |
| `price_cents` | `z.number()` |

### PurchaseSchema → `purchases`

| Field | Zod Type |
|-------|----------|
| `id` | `z.string()` |
| `module_id` | `z.string().nullable()` |
| `amount_cents` | `z.number()` |
| `currency` | `z.string()` |
| `status` | `z.string()` |
| `created_at` | `z.string()` |

### PendingQuizResultSchema _(client-only)_

| Field | Zod Type |
|-------|----------|
| `localId` | `z.string()` |
| `userId` | `z.string()` |
| `lectureId` | `z.string()` |
| `score` | `z.number()` |
| `totalQuestions` | `z.number()` |
| `correctAnswers` | `z.number()` |
| `createdAt` | `z.string()` |

### CachedLectureSchema _(client-only)_

| Field | Zod Type |
|-------|----------|
| `questions` | `z.array(QuestionSchema)` |
| `questionCount` | `z.number()` |
| `downloadedAt` | `z.string()` |
| `version` | `z.string().optional()` |

