# Data Dictionary

> **Auto-generated** by `docs/extractors/data-dictionary.js` from SQL migrations + Zod schemas.
> Guaranteed accurate — derived directly from source files.

## ⚠️ Schema Drift Warnings

| Type | Schema | Table | Field |
|------|--------|-------|-------|
| 🔴 In SQL, not in Zod | ModuleSchema | modules | `external_id` |
| 🔴 In SQL, not in Zod | ModuleSchema | modules | `price_cents` |
| 🟡 In Zod, not in SQL | LectureSchema | lectures | `question_count` |
| 🔴 In SQL, not in Zod | LectureSchema | lectures | `order_index` |
| 🔴 In SQL, not in Zod | SubjectSchema | subjects | `external_id` |
| 🔴 In SQL, not in Zod | YearSchema | years | `external_id` |
| 🟡 In Zod, not in SQL | QuestionSchema | questions | `answer` |
| 🔴 In SQL, not in Zod | QuestionSchema | questions | `lecture_id` |
| 🔴 In SQL, not in Zod | QuestionSchema | questions | `correct_answer_index` |
| 🔴 In SQL, not in Zod | QuestionSchema | questions | `question_order` |
| 🟡 In Zod, not in SQL | QuizResultSchema | quiz_results | `lecture_name` |
| 🟡 In Zod, not in SQL | UserStatsSchema | user_stats | `total_questions` |
| 🟡 In Zod, not in SQL | UserStatsSchema | user_stats | `streak` |
| 🟡 In Zod, not in SQL | UserStatsSchema | user_stats | `weekly_activity` |
| 🟡 In Zod, not in SQL | UserStatsSchema | user_stats | `day` |
| 🟡 In Zod, not in SQL | UserStatsSchema | user_stats | `count` |
| 🟡 In Zod, not in SQL | UserStatsSchema | user_stats | `isToday` |
| 🔴 In SQL, not in Zod | UserStatsSchema | user_stats | `user_id` |
| 🔴 In SQL, not in Zod | UserStatsSchema | user_stats | `total_questions_answered` |
| 🔴 In SQL, not in Zod | UserStatsSchema | user_stats | `correct_answers` |
| 🔴 In SQL, not in Zod | UserStatsSchema | user_stats | `current_streak` |
| 🔴 In SQL, not in Zod | UserStatsSchema | user_stats | `longest_streak` |
| 🔴 In SQL, not in Zod | UserStatsSchema | user_stats | `last_quiz_date` |
| 🔴 In SQL, not in Zod | PurchaseSchema | purchases | `user_id` |
| 🔴 In SQL, not in Zod | PurchaseSchema | purchases | `payment_id` |
| 🔴 In SQL, not in Zod | PurchaseSchema | purchases | `payment_session_id` |
| 🔴 In SQL, not in Zod | PurchaseSchema | purchases | `provider` |
| 🔴 In SQL, not in Zod | PurchaseSchema | purchases | `store_transaction_id` |

## 📦 Tables

### years
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | uuid_generate_v4() | — | — |
| `name` | TEXT NOT |  | ✅ | — | — | — |
| `external_id` | TEXT NOT |  | ✅ | — | — | — |
| `created_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |

**Constraints:** `unique_year_name`

### modules
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | uuid_generate_v4() | — | — |
| `year_id` | UUID NOT |  | ✅ | — | → years.id | — |
| `name` | TEXT NOT |  | ✅ | — | — | — |
| `external_id` | TEXT NOT |  | ✅ | — | — | — |
| `order_index` | INTEGER DEFAULT |  |  | 0 | — | — |
| `price_cents` | INTEGER NOT |  | ✅ | 0 | — | — |
| `external_price_id` | TEXT |  |  | — | — | — |
| `created_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |

**Constraints:** `unique_module_per_year`

### subjects
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | uuid_generate_v4() | — | — |
| `module_id` | UUID NOT |  | ✅ | — | → modules.id | — |
| `name` | TEXT NOT |  | ✅ | — | — | — |
| `external_id` | TEXT NOT |  | ✅ | — | — | — |
| `order_index` | INTEGER DEFAULT |  |  | 0 | — | — |
| `created_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |

**Constraints:** `unique_subject_per_module`

### lectures
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | uuid_generate_v4() | — | — |
| `subject_id` | UUID NOT |  | ✅ | — | → subjects.id | — |
| `name` | TEXT NOT |  | ✅ | — | — | — |
| `external_id` | TEXT NOT |  | ✅ | — | — | — |
| `order_index` | INTEGER DEFAULT |  |  | 0 | — | — |
| `is_free` | BOOLEAN DEFAULT |  |  | false | — | — |
| `created_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |

**Constraints:** `unique_lecture_per_subject`

### questions
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | uuid_generate_v4() | — | — |
| `lecture_id` | UUID NOT |  | ✅ | — | → lectures.id | — |
| `text` | TEXT NOT |  | ✅ | — | — | — |
| `image_url` | TEXT |  |  | — | — | — |
| `options` | JSONB NOT |  | ✅ | — | — | — |
| `correct_answer_index` | INTEGER NOT |  | ✅ | — | — | — |
| `explanation` | TEXT |  |  | — | — | — |
| `question_order` | INTEGER DEFAULT |  |  | 0 | — | — |
| `created_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |


### profiles
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID REFERENCES | ✅ | ✅ | — | → auth.users.id | — |
| `full_name` | TEXT |  |  | — | — | — |
| `avatar_url` | TEXT |  |  | — | — | — |
| `bio` | TEXT |  |  | — | — | — |
| `updated_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |


### user_stats
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `user_id` | UUID PRIMARY | ✅ | ✅ | — | → auth.users.id | — |
| `total_quizzes` | INTEGER NOT |  | ✅ | 0 | — | — |
| `total_questions_answered` | INTEGER NOT |  | ✅ | 0 | — | — |
| `correct_answers` | INTEGER NOT |  | ✅ | 0 | — | — |
| `average_score` | NUMERIC(5,2) NOT |  | ✅ | 0.00 | — | — |
| `best_score` | INTEGER NOT |  | ✅ | 0 | — | — |
| `current_streak` | INTEGER NOT |  | ✅ | 0 | — | — |
| `longest_streak` | INTEGER NOT |  | ✅ | 0 | — | — |
| `last_quiz_date` | DATE |  |  | — | — | — |
| `updated_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |


### quiz_results
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | uuid_generate_v4() | — | — |
| `user_id` | UUID NOT |  | ✅ | — | → auth.users.id | — |
| `lecture_id` | UUID NOT |  | ✅ | — | → lectures.id | — |
| `score` | INTEGER NOT |  | ✅ | — | — | score >= 0 AND score <= 100 |
| `total_questions` | INTEGER NOT |  | ✅ | — | — | total_questions > 0 |
| `correct_answers` | INTEGER NOT |  | ✅ | — | — | correct_answers >= 0 AND correct_answers <= total_questions |
| `created_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |

**Constraints:** `check_score_formula`

### feedback
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | gen_random_uuid() | — | — |
| `user_id` | UUID REFERENCES |  |  | — | → auth.users.id | — |
| `content` | TEXT NOT |  | ✅ | — | — | char_length(content) > 0 AND char_length(content) < 10000 |
| `metadata` | JSONB DEFAULT |  |  | '{}'::jsonb | — | — |
| `status` | TEXT DEFAULT |  |  | 'new' CHECK (status IN ('new' | — | status IN ('new', 'read', 'resolved', 'archived') |
| `created_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |


### lecture_statistics
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | gen_random_uuid() | — | — |
| `lecture_id` | UUID NOT |  | ✅ | — | → lectures.id | — |
| `unique_students` | INTEGER DEFAULT |  |  | 0 | — | — |
| `total_attempts` | INTEGER DEFAULT |  |  | 0 | — | — |
| `average_score` | NUMERIC(5,2) DEFAULT |  |  | 0.00 | — | — |
| `last_updated` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |


### purchases
_Source: `20260401000000_harvi_master_baseline.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | gen_random_uuid() | — | — |
| `user_id` | UUID NOT |  | ✅ | — | → auth.users.id | — |
| `module_id` | UUID REFERENCES |  |  | — | → modules.id | — |
| `status` | TEXT NOT |  | ✅ | — | — | status IN ('pending', 'active', 'failed', 'refunded', 'disputed') |
| `amount_cents` | INTEGER NOT |  | ✅ | — | — | amount_cents >= 0 |
| `currency` | TEXT NOT |  | ✅ | 'usd' | — | — |
| `payment_id` | TEXT NULL |  |  | — | — | — |
| `payment_session_id` | TEXT NULL |  |  | — | — | — |
| `provider` | TEXT NOT |  | ✅ | 'manual' | — | — |
| `created_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |
| `updated_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |
| `store_transaction_id` | TEXT |  |  | — | — | — |

**Constraints:** `check_purchase_has_module`

### access_codes
_Source: `20260627000001_access_codes.sql`_

| Column | Type | PK | Not Null | Default | FK | Check |
|--------|------|----|----------|---------|----|-------|
| `id` | UUID PRIMARY | ✅ | ✅ | gen_random_uuid() | — | — |
| `code` | TEXT NOT |  | ✅ | — | — | — |
| `module_id` | UUID NOT |  | ✅ | — | → modules.id | — |
| `batch_id` | TEXT |  |  | — | — | — |
| `redeemed_by` | UUID REFERENCES |  |  | — | → auth.users.id | — |
| `redeemed_at` | TIMESTAMPTZ |  |  | — | — | — |
| `expires_at` | TIMESTAMPTZ |  |  | — | — | — |
| `created_at` | TIMESTAMPTZ DEFAULT |  |  | now() | — | — |


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
| `weekly_activity` | `z.array(` |
| `day` | `z.string()` |
| `count` | `z.number()` |
| `isToday` | `z.boolean().optional()` |

### ContentAccessEntrySchema _(client-only)_

| Field | Zod Type |
|-------|----------|
| `item_id` | `z.string()` |
| `item_type` | `z.enum(["module"` |
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

