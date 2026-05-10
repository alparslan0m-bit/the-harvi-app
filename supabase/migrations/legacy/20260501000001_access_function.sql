-- 20260501000001_access_function.sql
BEGIN;

-- ============================================================
-- check_content_access(p_lecture_id)
-- 
-- SECURITY DEFINER: runs as DB owner, bypassing RLS on
-- internal entitlement tables (purchases, free_modules, etc.)
-- This is intentional — entitlement tables must NOT be
-- visible to the client directly.
--
-- Returns TRUE if the calling user may read this lecture's questions.
-- Used as the single source of truth in all content RLS policies.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_content_access(p_lecture_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public   -- Prevents search_path injection attacks
AS $$
    -- Step 1: Is the lecture's subject explicitly free?
    SELECT EXISTS (
        SELECT 1 FROM public.free_subjects fs
        JOIN public.lectures l ON l.subject_id = fs.subject_id
        WHERE l.id = p_lecture_id
    )
    OR
    -- Step 2: Is the lecture's module explicitly free?
    EXISTS (
        SELECT 1 FROM public.free_modules fm
        JOIN public.subjects s ON s.module_id = fm.module_id
        JOIN public.lectures l ON l.subject_id = s.id
        WHERE l.id = p_lecture_id
    )
    OR
    -- Step 3: Does the authenticated user have an active purchase
    --         for the module that contains this lecture?
    EXISTS (
        SELECT 1 FROM public.purchases p
        JOIN public.subjects s ON s.module_id = p.module_id
        JOIN public.lectures l ON l.subject_id = s.id
        WHERE l.id = p_lecture_id
          AND p.user_id = (SELECT auth.uid())   -- O(1): evaluated once
          AND p.status = 'active'
    );
$$;

-- ============================================================
-- get_module_access_map(p_user_id)
-- 
-- Returns one row per module with has_access and is_free flags.
-- Used by the client to render lock icons without exposing
-- the purchases table.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_module_access_map(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    module_id   UUID,
    has_access  BOOLEAN,
    is_free     BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        m.id AS module_id,
        (
            fm.module_id IS NOT NULL   -- explicitly free
            OR p.module_id IS NOT NULL -- user purchased it
        ) AS has_access,
        (fm.module_id IS NOT NULL) AS is_free
    FROM public.modules m
    LEFT JOIN public.free_modules fm ON fm.module_id = m.id
    LEFT JOIN public.purchases p
        ON p.module_id = m.id
        AND p.user_id = COALESCE(p_user_id, (SELECT auth.uid()))
        AND p.status = 'active';
$$;

-- ============================================================
-- is_admin()
-- 
-- Helper used in admin-only policies.
-- Reads from profiles.is_admin which only the service role
-- can set to true.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())),
        false
    );
$$;

COMMIT;
