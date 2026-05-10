-- =============================================================
-- PWA INSTALLATION TRACKING & DASHBOARD OPTIMIZATION
-- Targets: Zero-Cost Admin Dashboard (4-to-1 Request Reduction)
-- =============================================================

BEGIN;

-- 1. Create Anonymous Installation Tracking Table
CREATE TABLE IF NOT EXISTS public.pwa_installs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT, -- 'android', 'ios', 'windows', 'macos'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast counts
CREATE INDEX IF NOT EXISTS idx_pwa_installs_created ON public.pwa_installs(created_at);

-- RLS: Authenticated users can insert, Admin (service_role) only for read
ALTER TABLE public.pwa_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can log installation" ON public.pwa_installs;
CREATE POLICY "Anyone can log installation" ON public.pwa_installs 
    FOR INSERT TO authenticated, anon 
    WITH CHECK (true);

-- 2. "Single Request" Dashboard Stats RPC
-- Aggregates all 5 metrics in a single database execution
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT json_build_object(
        'totalStudents', (SELECT COUNT(*)::INTEGER FROM public.profiles),
        'totalQuestions', (SELECT COUNT(*)::INTEGER FROM public.questions),
        'totalQuizzes', (SELECT COUNT(*)::INTEGER FROM public.quiz_results),
        'activeToday', (SELECT COUNT(DISTINCT user_id)::INTEGER FROM public.quiz_results WHERE created_at >= CURRENT_DATE),
        'totalInstalls', (SELECT COUNT(*)::INTEGER FROM public.pwa_installs)
    ) INTO result;
    
    RETURN result;
END;
$$;

COMMIT;
