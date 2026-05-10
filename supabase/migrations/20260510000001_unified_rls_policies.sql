-- 20260510000001_unified_rls_policies.sql
-- Description: The Ultimate Unified RLS Architecture for Harvi.
-- This file centralizes all security functions, RLS enabling, and access policies.
-- Design Principle: Scalable, Admin-aware, and Performance-Hardened.

BEGIN;

-- =============================================
-- 1. SECURITY FUNCTIONS (The Logic Layer)
-- =============================================

-- 1.1 Admin Role Detection
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT (auth.jwt() ->> 'role' = 'service_role')
    OR (EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = (SELECT auth.uid())
      AND (raw_app_meta_data ->> 'role' = 'admin')
    ))
  );
END;
$$;

-- 1.2 The Master Access Gatekeeper (Performance Optimized)
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

-- 1.3 UI Access Map (Idempotent UI Badge Logic)
CREATE OR REPLACE FUNCTION public.get_content_access_map()
RETURNS TABLE (item_id UUID, item_type TEXT, has_access BOOLEAN, is_free BOOLEAN, price_cents INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
-- 2. ADMIN HELPERS (Privileged Operations)
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_grant_free_module(p_module_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    UPDATE public.modules SET is_free = true WHERE id = p_module_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_free_subject(p_subject_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    UPDATE public.subjects SET is_free = true WHERE id = p_subject_id;
END;
$$;

-- =============================================
-- 3. ENABLE RLS (The Boundary Layer)
-- =============================================

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

-- =============================================
-- 4. CLEANUP (Drop All Existing Policies)
-- =============================================
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- =============================================
-- 5. POLICIES: GLOBAL ADMIN BYPASS
-- =============================================

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

-- =============================================
-- 6. POLICIES: PUBLIC & STRUCTURAL
-- =============================================

CREATE POLICY "Public Read" ON public.years FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.lectures FOR SELECT USING (true);
CREATE POLICY "Authenticated Read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated Read" ON public.lecture_statistics FOR SELECT TO authenticated USING (true);

-- =============================================
-- 7. POLICIES: GATED CONTENT
-- =============================================

CREATE POLICY "Gated access to questions" ON public.questions FOR SELECT USING (check_content_access(lecture_id));

-- =============================================
-- 8. POLICIES: PRIVATE USER DATA
-- =============================================

-- Profiles
CREATE POLICY "Self Manage" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id);

-- Quiz Results (Read/Insert)
CREATE POLICY "Self Read" ON public.quiz_results FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Self Insert" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

-- Purchases (Read Only)
CREATE POLICY "Self Read" ON public.purchases FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Feedback (Self Read & Open Insert)
CREATE POLICY "Self Read" ON public.feedback FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Self Insert" ON public.feedback FOR INSERT TO authenticated, anon WITH CHECK (((SELECT auth.uid()) = user_id) OR (user_id IS NULL));

COMMIT;
