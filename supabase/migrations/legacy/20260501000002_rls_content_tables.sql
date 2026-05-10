-- 20260501000002_rls_content_tables.sql
BEGIN;

-- ============================================================
-- YEARS — public read (no purchase required to browse structure)
-- ============================================================
ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "years_public_read" ON public.years;
CREATE POLICY "years_public_read"
    ON public.years FOR SELECT
    TO authenticated, anon
    USING (true);   -- Structure is always visible; questions are gated


-- ============================================================
-- MODULES — public read (show lock icons in UI)
-- ============================================================
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_public_read" ON public.modules;
CREATE POLICY "modules_public_read"
    ON public.modules FOR SELECT
    TO authenticated, anon
    USING (true);   -- Titles visible; questions gated below


-- ============================================================
-- MODULE_PRICES — authenticated read only
-- ============================================================
ALTER TABLE public.module_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "module_prices_auth_read" ON public.module_prices;
CREATE POLICY "module_prices_auth_read"
    ON public.module_prices FOR SELECT
    TO authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "module_prices_admin_all" ON public.module_prices;
CREATE POLICY "module_prices_admin_all"
    ON public.module_prices FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));


-- ============================================================
-- SUBJECTS — public read
-- ============================================================
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subjects_public_read" ON public.subjects;
CREATE POLICY "subjects_public_read"
    ON public.subjects FOR SELECT
    TO authenticated, anon
    USING (true);


-- ============================================================
-- LECTURES — public read
-- ============================================================
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectures_public_read" ON public.lectures;
CREATE POLICY "lectures_public_read"
    ON public.lectures FOR SELECT
    TO authenticated, anon
    USING (true);


-- ============================================================
-- QUESTIONS — THE CRITICAL GATE
-- This is the only table where RLS enforces payment.
-- Anonymous users see 0 rows.
-- Authenticated users see rows only for lectures they can access.
-- ============================================================
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions_access_gate" ON public.questions;
CREATE POLICY "questions_access_gate"
    ON public.questions FOR SELECT
    TO authenticated
    USING (
        -- Single function call: O(index scan) not O(full scan)
        -- SECURITY DEFINER function handles all three access paths
        (SELECT public.check_content_access(lecture_id))
    );

-- Admin bypass — admins can see all questions
DROP POLICY IF EXISTS "questions_admin_all" ON public.questions;
CREATE POLICY "questions_admin_all"
    ON public.questions FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));


-- ============================================================
-- FREE_MODULES — admin write only, public read
-- ============================================================
ALTER TABLE public.free_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "free_modules_public_read" ON public.free_modules;
CREATE POLICY "free_modules_public_read"
    ON public.free_modules FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "free_modules_admin_write" ON public.free_modules;
CREATE POLICY "free_modules_admin_write"
    ON public.free_modules FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));


-- ============================================================
-- FREE_SUBJECTS — admin write only, public read
-- ============================================================
ALTER TABLE public.free_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "free_subjects_public_read" ON public.free_subjects;
CREATE POLICY "free_subjects_public_read"
    ON public.free_subjects FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "free_subjects_admin_write" ON public.free_subjects;
CREATE POLICY "free_subjects_admin_write"
    ON public.free_subjects FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

COMMIT;
