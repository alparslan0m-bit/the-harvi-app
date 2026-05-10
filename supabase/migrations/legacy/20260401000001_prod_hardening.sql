-- =============================================================
-- HARVI MASTER PRODUCTION SETUP
-- Comprehensive database architecture for scalability and cost
-- =============================================================

BEGIN;

-- 1. TABLES & RELATIONS (If not already created)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) < 10000),
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PERFORMANCE INDEXES (The "Shield" against slow scans)
-- -------------------------------------------------------------
-- Index 1: Quiz results by user (most frequent query)
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_created 
ON public.quiz_results(user_id, created_at DESC);

-- Index 2: Questions by lecture (quiz loading)
CREATE INDEX IF NOT EXISTS idx_questions_lecture_order 
ON public.questions(lecture_id, question_order);

-- Index 3: Quiz results by lecture
CREATE INDEX IF NOT EXISTS idx_quiz_results_lecture 
ON public.quiz_results(lecture_id);

-- Index 4: Feedback by status
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);

-- 3. RLS POLICIES (Optimized with (SELECT auth.uid()) constant wrapper)
-- -------------------------------------------------------------
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Feedback: Guests can insert, only service_role (Admin) can read
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO authenticated, anon WITH CHECK ( (auth.uid() = user_id) OR (user_id IS NULL) );

-- Profiles: Public Read, Self Update
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id);

-- Quiz Results: Self Read, Self Insert
DROP POLICY IF EXISTS "Users can view their own results" ON public.quiz_results;
CREATE POLICY "Users can view their own results" ON public.quiz_results FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own results" ON public.quiz_results;
CREATE POLICY "Users can insert their own results" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. RPC FUNCTIONS (Egress Reduction Layer)
-- -------------------------------------------------------------

-- Aggregate Stats Function
CREATE OR REPLACE FUNCTION get_user_aggregate_stats(user_uuid UUID)
RETURNS TABLE(total_quizzes BIGINT, total_questions BIGINT, total_correct BIGINT, best_score INTEGER) 
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
    SELECT COUNT(*)::BIGINT, COALESCE(SUM(total_questions), 0)::BIGINT, COALESCE(SUM(correct_answers), 0)::BIGINT, COALESCE(MAX(score), 0)::INTEGER
    FROM public.quiz_results WHERE user_id = user_uuid;
$$;

-- Streak Calculation Function
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

-- 5. AUTOMATION: Profile Creator Trigger
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
