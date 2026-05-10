-- 20260501000008_cleanup_redundant_tables.sql
BEGIN;

-- 1. Sync data to the new columns before dropping
UPDATE public.modules 
SET is_free = true 
WHERE id IN (SELECT module_id FROM public.free_modules);

UPDATE public.subjects 
SET is_free = true 
WHERE id IN (SELECT subject_id FROM public.free_subjects);

-- 2. Update prices from the old price table if they exist
UPDATE public.modules m
SET price_cents = mp.amount_cents,
    external_price_id = mp.external_price_id
FROM public.module_prices mp
WHERE mp.module_id = m.id;

-- 3. DROP the redundant tables
DROP TABLE IF EXISTS public.free_modules;
DROP TABLE IF EXISTS public.free_subjects;
DROP TABLE IF EXISTS public.module_prices;

-- 4. UPDATE Admin Helper Functions to use the new columns
CREATE OR REPLACE FUNCTION public.admin_grant_free_module(
    p_module_id UUID,
    p_notes     TEXT DEFAULT NULL -- notes can be moved to a metadata column if needed
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    UPDATE public.modules 
    SET is_free = true 
    WHERE id = p_module_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_free_module(p_module_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    UPDATE public.modules 
    SET is_free = false 
    WHERE id = p_module_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_free_subject(
    p_subject_id UUID,
    p_notes      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    UPDATE public.subjects 
    SET is_free = true 
    WHERE id = p_subject_id;
END;
$$;

COMMIT;
