-- 20260501000007_unified_purchase_logic.sql
BEGIN;

-- 1. Enhance MODULES table
ALTER TABLE public.modules 
    ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS external_price_id TEXT;

-- 2. Enhance SUBJECTS table
-- This allows you to sell individual subjects!
ALTER TABLE public.subjects 
    ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS external_price_id TEXT;

-- 3. Enhance PURCHASES table
-- Allow subject_id to be purchased directly
ALTER TABLE public.purchases 
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    -- Make module_id nullable so we can have subject-only purchases
    ALTER COLUMN module_id DROP NOT NULL;

-- 4. CLEANUP: Migrate data from old tables (if any)
-- (Assuming you haven't populated them much yet, otherwise we'd do a SELECT INTO)
-- We can eventually drop free_modules, free_subjects, and module_prices.

-- 5. UPDATE the Access Function (The Source of Truth)
CREATE OR REPLACE FUNCTION public.check_content_access(p_lecture_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.lectures l
        JOIN public.subjects s ON s.id = l.subject_id
        JOIN public.modules m ON m.id = s.module_id
        WHERE l.id = p_lecture_id
          AND (
            -- Case 1: Subject is explicitly free
            s.is_free = true 
            OR 
            -- Case 2: Parent Module is explicitly free
            m.is_free = true
            OR
            -- Case 3: User purchased this specific Subject
            EXISTS (
                SELECT 1 FROM public.purchases p 
                WHERE p.user_id = auth.uid() 
                  AND p.subject_id = s.id 
                  AND p.status = 'active'
            )
            OR
            -- Case 4: User purchased the parent Module
            EXISTS (
                SELECT 1 FROM public.purchases p 
                WHERE p.user_id = auth.uid() 
                  AND p.module_id = m.id 
                  AND p.status = 'active'
            )
          )
    );
$$;

-- 6. UPDATE the Access Map RPC for the UI
CREATE OR REPLACE FUNCTION public.get_content_access_map()
RETURNS TABLE (
    item_id     UUID,
    item_type   TEXT,
    has_access  BOOLEAN,
    is_free     BOOLEAN,
    price_cents INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Modules access
    SELECT 
        m.id as item_id,
        'module' as item_type,
        (m.is_free OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid() AND p.module_id = m.id AND p.status = 'active')) as has_access,
        m.is_free,
        m.price_cents
    FROM public.modules m
    
    UNION ALL
    
    -- Subjects access
    SELECT 
        s.id as item_id,
        'subject' as item_type,
        (
            s.is_free 
            OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid() AND p.module_id = s.module_id AND p.status = 'active')
            OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid() AND p.subject_id = s.id AND p.status = 'active')
        ) as has_access,
        s.is_free,
        s.price_cents
    FROM public.subjects s;
$$;

COMMIT;
