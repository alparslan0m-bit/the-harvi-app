-- ============================================================================
-- SECURITY FIX P1: Tighten pwa_installs RLS
--
-- Problem: The original policy allowed `anon` role inserts. Since the
-- Supabase URL and anon key are public (NEXT_PUBLIC_*), any attacker
-- could bypass Server Actions and insert directly via the REST API.
--
-- Fix: Restrict inserts to `authenticated` only, and require user_id match.
-- ============================================================================

-- 1. Add user_id column if not present (our audit fix #3 now sends it)
ALTER TABLE public.pwa_installs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Drop the overly-permissive policy
DROP POLICY IF EXISTS "Anyone can log installation" ON public.pwa_installs;

-- 3. Create strict policy: authenticated users only, must match their own ID
CREATE POLICY "Authenticated users can log own installation" ON public.pwa_installs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 4. Prevent duplicate installs per user (dedup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pwa_installs_user_unique
    ON public.pwa_installs(user_id)
    WHERE user_id IS NOT NULL;
