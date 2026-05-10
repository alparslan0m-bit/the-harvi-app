-- 20260401000000_harvi_master_baseline.sql
-- Description: The Ultimate Harvi Master Baseline (Final Edition)
-- This file consolidates 100% of the Harvi Faculty Architecture: 
-- Core Schema, Security, Monetization, Analytics, and Performance Hardening.

BEGIN;

-- =============================================
-- 1. EXTENSIONS & SCHEMA SETUP
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =============================================
-- 2. CORE ACADEMIC HIERARCHY
-- =============================================

-- Level 1: Years (Academic Programs)
CREATE TABLE IF NOT EXISTS public.years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    external_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_year_name UNIQUE (name)
);

-- Level 2: Modules (e.g., Cardiovascular System)
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year_id UUID NOT NULL REFERENCES public.years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_id TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    -- Unified Monetization Logic
    is_free BOOLEAN NOT NULL DEFAULT false,
    price_cents INTEGER NOT NULL DEFAULT 0,
    external_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_module_per_year UNIQUE (name, year_id)
);

-- Level 3: Subjects (e.g., Anatomy, Physiology)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_id TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    -- Unified Monetization Logic
    is_free BOOLEAN NOT NULL DEFAULT false,
    price_cents INTEGER NOT NULL DEFAULT 0,
    external_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_subject_per_module UNIQUE (name, module_id)
);

-- Level 4: Lectures (e.g., Anatomy of the Heart)
CREATE TABLE IF NOT EXISTS public.lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_id TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_lecture_per_subject UNIQUE (name, subject_id)
);

-- Level 5: Questions (The MCQs)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    options JSONB NOT NULL, -- Format: ["Opt A", "Opt B", "Opt C", "Opt D"]
    correct_answer_index INTEGER NOT NULL,
    explanation TEXT,
    question_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. STUDENT DATA & ANALYTICS
-- =============================================

-- Profiles (Synced with Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz Results
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- Percentage (0-100)
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) < 10000),
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- PWA Installation Tracking
CREATE TABLE IF NOT EXISTS public.pwa_installs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    platform TEXT, -- 'android', 'ios', 'windows', 'macos'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Real-time Aggregate Statistics Table
CREATE TABLE IF NOT EXISTS public.lecture_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE UNIQUE,
    unique_students INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    average_score NUMERIC(5,2) DEFAULT 0.00,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 4. MONETIZATION ENGINE
-- =============================================

CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'failed', 'refunded', 'disputed')),
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    payment_id TEXT, -- provider-specific reference
    payment_session_id TEXT, -- checkout session reference
    provider TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- 5. CORE SECURITY & LOGIC FUNCTIONS
-- =============================================

-- Admin Role Detection
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (auth.jwt() ->> 'role' = 'service_role')
    OR (EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (raw_app_meta_data ->> 'role' = 'admin')
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The Master Access Gatekeeper
CREATE OR REPLACE FUNCTION public.check_content_access(p_lecture_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.lectures l JOIN public.subjects s ON s.id = l.subject_id JOIN public.modules m ON m.id = s.module_id
        WHERE l.id = p_lecture_id AND (
            is_admin() OR s.is_free = true OR m.is_free = true OR
            EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid() AND p.subject_id = s.id AND p.status = 'active') OR
            EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid() AND p.module_id = m.id AND p.status = 'active')
        )
    );
$$;

-- UI Access Map
CREATE OR REPLACE FUNCTION public.get_content_access_map()
RETURNS TABLE (item_id UUID, item_type TEXT, has_access BOOLEAN, is_free BOOLEAN, price_cents INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT id, 'module', true, is_free, price_cents FROM public.modules WHERE is_admin()
    UNION ALL
    SELECT m.id, 'module', (m.is_free OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid() AND p.module_id = m.id AND p.status = 'active')), m.is_free, m.price_cents FROM public.modules m WHERE NOT is_admin()
    UNION ALL
    SELECT s.id, 'subject', (s.is_free OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid() AND p.module_id = s.module_id AND p.status = 'active') OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid() AND p.subject_id = s.id AND p.status = 'active')), s.is_free, s.price_cents FROM public.subjects s WHERE NOT is_admin();
$$;

-- Analytics: Streak Calculation
CREATE OR REPLACE FUNCTION get_user_streak(user_uuid UUID)
RETURNS INTEGER LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE streak INTEGER := 0; prev_date DATE := NULL; rec RECORD;
BEGIN
    PERFORM 1 FROM public.quiz_results WHERE user_id = user_uuid AND DATE(created_at) >= CURRENT_DATE - INTERVAL '1 day' LIMIT 1;
    IF NOT FOUND THEN RETURN 0; END IF;
    FOR rec IN SELECT DISTINCT DATE(created_at) as quiz_date FROM public.quiz_results WHERE user_id = user_uuid ORDER BY quiz_date DESC LOOP
        IF prev_date IS NULL THEN streak := 1; prev_date := rec.quiz_date;
        ELSIF prev_date - rec.quiz_date = 1 THEN streak := streak + 1; prev_date := rec.quiz_date;
        ELSE EXIT; END IF;
    END LOOP;
    RETURN streak;
END;
$$;

-- Dashboard: Admin KPIs
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSONB;
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

-- Deterministic Slug Generator
CREATE OR REPLACE FUNCTION set_default_external_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.external_id IS NULL OR trim(NEW.external_id) = '' THEN
    IF TG_TABLE_NAME = 'years' THEN
      NEW.external_id := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '', 'g'));
    ELSE
      NEW.external_id := trim(both '_' from lower(regexp_replace(trim(NEW.name), '[^a-zA-Z0-9]+', '_', 'g')));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. ADMIN HELPERS (GOD MODE)
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_grant_free_module(p_module_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    UPDATE public.modules SET is_free = true WHERE id = p_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_grant_free_subject(p_subject_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    UPDATE public.subjects SET is_free = true WHERE id = p_subject_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. TRIGGERS & AUTOMATION
-- =============================================

-- Profile Sync
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Real-time Stats Sync
CREATE OR REPLACE FUNCTION sync_lecture_stats() RETURNS TRIGGER AS $$
DECLARE is_new_student BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM quiz_results WHERE lecture_id = NEW.lecture_id AND user_id = NEW.user_id AND id != NEW.id) INTO is_new_student;
    INSERT INTO public.lecture_statistics (lecture_id, unique_students, total_attempts, average_score, last_updated)
    VALUES (NEW.lecture_id, CASE WHEN is_new_student THEN 1 ELSE 0 END, 1, NEW.score::NUMERIC, now())
    ON CONFLICT (lecture_id) DO UPDATE SET
        unique_students = lecture_statistics.unique_students + (CASE WHEN is_new_student THEN 1 ELSE 0 END),
        average_score = ROUND(((lecture_statistics.average_score * lecture_statistics.total_attempts) + NEW.score) / (lecture_statistics.total_attempts + 1), 2),
        total_attempts = lecture_statistics.total_attempts + 1, last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sync_lecture_stats AFTER INSERT ON public.quiz_results FOR EACH ROW EXECUTE FUNCTION sync_lecture_stats();

-- External ID Enforcement
CREATE TRIGGER ensure_external_id_years BEFORE INSERT OR UPDATE ON years FOR EACH ROW EXECUTE FUNCTION set_default_external_id();
CREATE TRIGGER ensure_external_id_modules BEFORE INSERT OR UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION set_default_external_id();
CREATE TRIGGER ensure_external_id_subjects BEFORE INSERT OR UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION set_default_external_id();
CREATE TRIGGER ensure_external_id_lectures BEFORE INSERT OR UPDATE ON lectures FOR EACH ROW EXECUTE FUNCTION set_default_external_id();

-- =============================================
-- 7. SECURITY: ROW LEVEL SECURITY (RLS)
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
ALTER TABLE public.pwa_installs ENABLE ROW LEVEL SECURITY;

-- Read Access
CREATE POLICY "Public Read" ON public.years FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.lectures FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.profiles FOR SELECT USING (true);

-- THE GATEKEEPER: Gated access to questions
CREATE POLICY "Gated access to questions" ON public.questions FOR SELECT USING (check_content_access(lecture_id));

-- Private Data
CREATE POLICY "Self Manage" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Self Read" ON public.quiz_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Self Insert" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO authenticated, anon WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));
CREATE POLICY "Authenticated users can log own installation" ON public.pwa_installs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 8. PERFORMANCE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_date ON public.quiz_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_lecture_order ON public.questions(lecture_id, question_order);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_lecture_stats_lecture ON public.lecture_statistics(lecture_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_pwa_installs_user_unique ON public.pwa_installs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_lecture ON public.quiz_results(user_id, lecture_id);

-- =============================================
-- 9. MAINTENANCE: CRON JOBS
-- =============================================

SELECT cron.schedule('harvi-weekly-cleanup', '0 3 * * 0', $$
    BEGIN;
        DELETE FROM public.quiz_results WHERE created_at < NOW() - INTERVAL '1 year';
        DELETE FROM public.feedback WHERE created_at < NOW() - INTERVAL '1 year';
    COMMIT;
$$);

COMMIT;
