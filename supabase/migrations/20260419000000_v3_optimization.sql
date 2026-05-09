-- =============================================================
-- HARVI OPTIMIZATION V3: Database Schema Hardening
-- 
-- Focused on:
-- 1. Missing Foreign Key Indices (Prevents sequential scans on joins/deletes)
-- 2. Specialized Partial Indices (Optimizes specific query patterns)
-- 3. Composite Indices (Speeds up multi-column filtering)
-- 
-- SAFETY: All statements use IF NOT EXISTS to be idempotent.
-- =============================================================

BEGIN;

-- 1. FEEDBACK TABLE
-- Optimizes: RLS checks (auth.uid() = user_id) and user-specific feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);

-- 2. HIERARCHY TABLES (Future-proofing Server-side Joins)
-- Even if currently using JSON, these protect performance if we ever join tables.
-- Also speeds up CASCADE DELETE operations if parents are removed.
CREATE INDEX IF NOT EXISTS idx_modules_year_id ON public.modules(year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_module_id ON public.subjects(module_id);

-- 3. QUIZ RESULTS TABLE
-- Optimizes: "Show my best score for this lecture"
-- Queries filtering by BOTH user and lecture are very common in UI logic.
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_lecture ON public.quiz_results(user_id, lecture_id);


-- 5. SCHEMA CLEANUP: Remove Legacy Columns
-- Icons are now handled in code/frontend, so we drop these columns to save space.
ALTER TABLE public.years DROP COLUMN IF EXISTS icon;
ALTER TABLE public.modules DROP COLUMN IF EXISTS icon;
ALTER TABLE public.subjects DROP COLUMN IF EXISTS icon;

COMMIT;
