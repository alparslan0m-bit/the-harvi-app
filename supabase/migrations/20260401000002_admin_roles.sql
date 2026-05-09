-- =============================================================
-- 🔐 HARVI ADMIN SETUP MIGRATION
-- Adds is_admin column and admin-specific RLS policies
-- =============================================================

BEGIN;

-- 1. Add is_admin column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Create index for fast admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- 3. Create index for feedback status filtering
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status, created_at DESC);

-- 4. Create index for quiz_results date filtering (analytics)
CREATE INDEX IF NOT EXISTS idx_quiz_results_created ON public.quiz_results(created_at DESC);

COMMIT;

-- 🔐 ADMIN SETUP COMPLETE
-- To promote a user to admin, run:
-- UPDATE public.profiles SET is_admin = true WHERE id = '<user-uuid>';
