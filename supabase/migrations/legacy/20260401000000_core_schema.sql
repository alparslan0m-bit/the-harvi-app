-- =============================================================
-- 🏛️ HARVI FACULTY ARCHITECTURE BLUEPRINT (v1.0)
-- A Complete, High-Performance MCQ Platform Schema perfect 
-- Designed for 10,000+ Students on the Supabase Free Tier
-- =============================================================

BEGIN;

-- =============================================
-- 1. EXTENSIONS & SCHEMA SETUP
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. CORE HIERARCHY (The Academic Structure)
-- =============================================

-- Level 1: Educational Program (e.g., Medicine 2024)
CREATE TABLE public.years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Level 2: Academic Modules (e.g., Cardiovascular System)
CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year_id UUID REFERENCES public.years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Level 3: Subjects (e.g., Anatomy, Physiology)
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Level 4: Lectures (e.g., Anatomy of the Heart)
CREATE TABLE public.lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Level 5: Questions (The MCQs)
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    options JSONB NOT NULL, -- Format: ["Opt A", "Opt B", "Opt C", "Opt D"]
    correct_answer_index INTEGER NOT NULL,
    explanation TEXT,
    question_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. STUDENT DATA (Performance & Profiles)
-- =============================================

-- Student Profiles (Synced with Auth)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz Results (The Lightweight Summary Model)
CREATE TABLE public.quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- Percentage (e.g., 85)
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback & Bug Reports
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) < 10000),
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 4. SENIOR PERFORMANCE INDEXES
-- =============================================

-- Optimized for Stats & Streaks
CREATE INDEX idx_quiz_results_user_date ON public.quiz_results(user_id, created_at DESC);
-- Optimized for Quiz Loading
CREATE INDEX idx_questions_lecture_order ON public.questions(lecture_id, question_order);
-- Optimized for Subject Joins
CREATE INDEX idx_lectures_subject ON public.lectures(subject_id);

-- =============================================
-- 5. RPC FUNCTIONS (Egress Reduction Layer)
-- =============================================

-- Fast Aggregate Statistics
CREATE OR REPLACE FUNCTION get_user_aggregate_stats(user_uuid UUID)
RETURNS TABLE(total_quizzes BIGINT, total_questions BIGINT, total_correct BIGINT, best_score INTEGER) 
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
    SELECT 
        COUNT(*)::BIGINT, 
        COALESCE(SUM(total_questions), 0)::BIGINT, 
        COALESCE(SUM(correct_answers), 0)::BIGINT, 
        COALESCE(MAX(score), 0)::INTEGER
    FROM public.quiz_results 
    WHERE user_id = user_uuid;
$$;

-- High-Performance Streak Calculation
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


-- =============================================
-- 7. AUTOMATION: PROFILE SYNC TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- 🏛️ HARVI BLUEPRINT DEPLOYED. READY FOR CONTENT INGESTION.
