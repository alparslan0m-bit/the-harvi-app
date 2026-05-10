-- 20260510000000_rls_hardening.sql
-- Description: Senior-level RLS hardening, performance optimization, and admin bypass.
-- Applied to: Harvi Database

BEGIN;

-- =============================================
-- 1. FUNCTION OPTIMIZATION
-- =============================================

-- The Master Access Gatekeeper (Optimized for performance and admin bypass)
CREATE OR REPLACE FUNCTION public.check_content_access(p_lecture_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT 
        is_admin() OR 
        EXISTS (
            SELECT 1 
            FROM public.lectures l 
            JOIN public.subjects s ON s.id = l.subject_id 
            JOIN public.modules m ON m.id = s.module_id
            WHERE l.id = p_lecture_id AND (
                s.is_free = true OR 
                m.is_free = true OR
                EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.subject_id = s.id AND p.status = 'active') OR
                EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = m.id AND p.status = 'active')
            )
        );
$$;

-- UI Access Map (Optimized for performance and admin bypass)
CREATE OR REPLACE FUNCTION public.get_content_access_map()
RETURNS TABLE (item_id UUID, item_type TEXT, has_access BOOLEAN, is_free BOOLEAN, price_cents INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    -- Admin: Full Access
    SELECT id, 'module', true, is_free, price_cents FROM public.modules WHERE is_admin()
    UNION ALL
    -- Non-Admin: Modules
    SELECT m.id, 'module', (m.is_free OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = m.id AND p.status = 'active')), m.is_free, m.price_cents FROM public.modules m WHERE NOT is_admin()
    UNION ALL
    -- Non-Admin: Subjects
    SELECT s.id, 'subject', (s.is_free OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = s.module_id AND p.status = 'active') OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.subject_id = s.id AND p.status = 'active')), s.is_free, s.price_cents FROM public.subjects s WHERE NOT is_admin();
$$;

-- =============================================
-- 2. SECURITY: ROW LEVEL SECURITY (RLS)
-- =============================================

-- Ensure RLS is enabled on all tables
ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_statistics ENABLE ROW LEVEL SECURITY;

-- 2.1 DROP OLD POLICIES (To avoid conflicts during migration)
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2.2 Admin Global Access (God Mode)
CREATE POLICY "Admins have full access" ON public.years FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access" ON public.modules FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access" ON public.subjects FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access" ON public.lectures FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access" ON public.questions FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access" ON public.profiles FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access" ON public.quiz_results FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access" ON public.feedback FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access" ON public.purchases FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access" ON public.lecture_statistics FOR ALL TO authenticated USING (is_admin());

-- 2.3 Read Access (Structural & Profiles)
CREATE POLICY "Public Read" ON public.years FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.lectures FOR SELECT USING (true);
CREATE POLICY "Authenticated Read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated Read" ON public.lecture_statistics FOR SELECT TO authenticated USING (true);

-- 2.4 Gated Access (Content)
CREATE POLICY "Gated access to questions" ON public.questions FOR SELECT USING (check_content_access(lecture_id));

-- 2.5 Private Data (Self-Manage & Append-Only)
CREATE POLICY "Self Manage" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "Self Read" ON public.quiz_results FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Self Insert" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Self Read" ON public.purchases FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Self Read" ON public.feedback FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Self Insert" ON public.feedback FOR INSERT TO authenticated, anon WITH CHECK (((SELECT auth.uid()) = user_id) OR (user_id IS NULL));

-- =============================================
-- 3. PERFORMANCE INDEXES
-- =============================================

-- Hierarchy Performance (Foreign Keys)
CREATE INDEX IF NOT EXISTS idx_modules_year_id ON public.modules(year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_module_id ON public.subjects(module_id);
CREATE INDEX IF NOT EXISTS idx_lectures_subject_id ON public.lectures(subject_id);

-- User Data Performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_date ON public.quiz_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);

COMMIT;
