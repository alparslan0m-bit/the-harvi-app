-- 20260712000001_module_only_purchases.sql
-- Description: Enforce module-only purchase model.
-- Removes all subject-level purchase logic:
--   - purchases.subject_id column + constraint
--   - subjects.price_cents and external_price_id columns
--   - access_codes.subject_id column + constraint
--   - Updates check_content_access(), get_content_access_map(), redeem_access_code()
-- Keeps: lectures.is_free for free lecture support.

BEGIN;

-- =============================================
-- 1. PURCHASES TABLE: Remove subject_id
-- =============================================

-- Drop the old XOR constraint (module_id XOR subject_id)
ALTER TABLE public.purchases
    DROP CONSTRAINT IF EXISTS check_purchase_target;

-- Drop subject_id column (cascade drops the FK)
ALTER TABLE public.purchases
    DROP COLUMN IF EXISTS subject_id;

-- Add new constraint: module_id is always required
ALTER TABLE public.purchases
    ADD CONSTRAINT check_purchase_has_module CHECK (module_id IS NOT NULL);

-- Drop the now-useless subject index
DROP INDEX IF EXISTS idx_purchases_user_subject_status;

-- =============================================
-- 2. SUBJECTS TABLE: Remove pricing columns
-- =============================================

ALTER TABLE public.subjects
    DROP COLUMN IF EXISTS price_cents,
    DROP COLUMN IF EXISTS external_price_id;

-- =============================================
-- 3. ACCESS_CODES TABLE: Remove subject_id
-- =============================================

ALTER TABLE public.access_codes
    DROP CONSTRAINT IF EXISTS check_code_target;

ALTER TABLE public.access_codes
    DROP COLUMN IF EXISTS subject_id;

ALTER TABLE public.access_codes
    ADD CONSTRAINT check_code_has_module CHECK (module_id IS NOT NULL);

-- =============================================
-- 4. UPDATE check_content_access()
-- =============================================
-- Access = admin OR lecture is_free OR module purchased

CREATE OR REPLACE FUNCTION public.check_content_access(p_lecture_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        is_admin() OR
        EXISTS (
            SELECT 1
            FROM public.lectures l
            JOIN public.subjects s ON s.id = l.subject_id
            JOIN public.modules m ON m.id = s.module_id
            WHERE l.id = p_lecture_id AND (
                l.is_free = true OR
                EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = m.id AND p.status = 'active')
            )
        );
$$;

-- =============================================
-- 5. UPDATE get_content_access_map()
-- =============================================
-- Modules: has_access if purchased or admin
-- Subjects: has_access if parent module purchased or admin (no own price)

CREATE OR REPLACE FUNCTION public.get_content_access_map()
RETURNS TABLE (item_id UUID, item_type TEXT, has_access BOOLEAN, is_free BOOLEAN, price_cents INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Modules
    SELECT
        m.id,
        'module',
        (public.is_admin() OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = m.id AND p.status = 'active')),
        false AS is_free,
        m.price_cents
    FROM public.modules m
    UNION ALL
    -- Subjects: access derived from parent module purchase
    SELECT
        s.id,
        'subject',
        (public.is_admin() OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = s.module_id AND p.status = 'active')),
        false AS is_free,
        0 AS price_cents
    FROM public.subjects s;
$$;

-- =============================================
-- 6. UPDATE redeem_access_code() — module-only
-- =============================================

CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code_row public.access_codes%ROWTYPE;
    v_item_name TEXT;
    v_uid UUID := (SELECT auth.uid());
BEGIN
    -- Must be authenticated
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Normalize: strip whitespace and dashes, uppercase
    p_code := upper(regexp_replace(trim(p_code), '[-\s]', '', 'g'));

    -- Look up the code with a row lock to prevent race conditions
    SELECT * INTO v_code_row
    FROM public.access_codes
    WHERE code = p_code
    FOR UPDATE SKIP LOCKED;

    IF v_code_row IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid code');
    END IF;

    -- Check if already redeemed
    IF v_code_row.redeemed_by IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'This code has already been used');
    END IF;

    -- Check expiry
    IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'This code has expired');
    END IF;

    -- Check if user already has active access to this module
    IF EXISTS (
        SELECT 1 FROM public.purchases
        WHERE user_id = v_uid AND module_id = v_code_row.module_id AND status = 'active'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You already have access to this content');
    END IF;

    SELECT name INTO v_item_name FROM public.modules WHERE id = v_code_row.module_id;

    -- Mark code as redeemed
    UPDATE public.access_codes
    SET redeemed_by = v_uid, redeemed_at = now()
    WHERE id = v_code_row.id;

    -- Insert purchase record (unified with IAP purchases)
    INSERT INTO public.purchases (
        user_id, module_id, status, amount_cents, currency, provider, payment_id
    ) VALUES (
        v_uid,
        v_code_row.module_id,
        'active',
        0,
        'usd',
        'code',
        'code:' || v_code_row.code
    );

    RETURN jsonb_build_object(
        'success', true,
        'item_name', COALESCE(v_item_name, 'Content'),
        'item_type', 'module',
        'item_id', v_code_row.module_id
    );
END;
$$;

-- =============================================
-- 7. UPDATE admin_generate_codes() — module-only
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_generate_codes(
    p_target_id UUID,
    p_count INTEGER,
    p_expires_days INTEGER DEFAULT NULL
)
RETURNS TABLE (code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch_id TEXT;
    v_expires_at TIMESTAMPTZ;
    v_new_code TEXT;
    i INTEGER;
BEGIN
    -- Admin only
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Validate module exists
    PERFORM 1 FROM public.modules WHERE id = p_target_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Module not found'; END IF;

    -- Validate count
    IF p_count < 1 OR p_count > 500 THEN
        RAISE EXCEPTION 'Count must be between 1 and 500';
    END IF;

    v_batch_id := 'batch_' || encode(gen_random_bytes(4), 'hex') || '_' || to_char(now(), 'YYYYMMDD');

    IF p_expires_days IS NOT NULL THEN
        v_expires_at := now() + (p_expires_days || ' days')::INTERVAL;
    END IF;

    FOR i IN 1..p_count LOOP
        -- Generate a 16-char code in XXXX-XXXX-XXXX-XXXX format (stored without dashes)
        v_new_code := upper(encode(gen_random_bytes(8), 'hex'));

        INSERT INTO public.access_codes (
            code, module_id, batch_id, expires_at
        ) VALUES (
            v_new_code,
            p_target_id,
            v_batch_id,
            v_expires_at
        );

        -- Format with dashes for display
        code := substr(v_new_code, 1, 4) || '-' || substr(v_new_code, 5, 4) || '-' || substr(v_new_code, 9, 4) || '-' || substr(v_new_code, 13, 4);
        RETURN NEXT;
    END LOOP;
END;
$$;

COMMIT;
