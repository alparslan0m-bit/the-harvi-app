-- 20260627000001_access_codes.sql
-- Description: Access code redemption system for bookshop-sold codes.
-- Adds: access_codes table, redeem RPC, admin batch generation function.
-- Access codes insert into the existing `purchases` table with provider='code',
-- so all existing access-check logic (get_content_access_map, check_content_access) works unchanged.

BEGIN;

-- =============================================
-- 1. ACCESS CODES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    batch_id TEXT,
    redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_batch ON public.access_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_redeemed_by ON public.access_codes(redeemed_by) WHERE redeemed_by IS NOT NULL;

-- =============================================
-- 2. RLS POLICIES
-- =============================================

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admins_access_codes_all"
    ON public.access_codes FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Students can only see codes they've redeemed
CREATE POLICY "access_codes_self_read"
    ON public.access_codes FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = redeemed_by);

-- =============================================
-- 3. REDEEM ACCESS CODE (Student-facing RPC)
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
    -- CHANGED: Removed SKIP LOCKED. This forces concurrent requests to wait
    -- for the lock to be released, rather than immediately returning NULL.
    SELECT * INTO v_code_row
    FROM public.access_codes
    WHERE code = p_code
    FOR UPDATE;

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
-- 4. ADMIN: BATCH GENERATE CODES
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_generate_codes(
    p_target_id UUID,         -- the module UUID
    p_count INTEGER,          -- how many codes to generate
    p_expires_days INTEGER DEFAULT NULL -- optional: days until expiry
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

    -- Validate target exists
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
        -- Generate a 6-digit random number (000000 to 999999)
        v_new_code := lpad((floor(random() * 1000000))::text, 6, '0');

        INSERT INTO public.access_codes (
            code, module_id, batch_id, expires_at
        ) VALUES (
            v_new_code,
            p_target_id,
            v_batch_id,
            v_expires_at
        );

        code := v_new_code;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- =============================================
-- 5. UPDATE purchases TABLE: ADD IAP COLUMNS
-- =============================================

-- Add IAP-specific columns to existing purchases table
ALTER TABLE public.purchases
    ADD COLUMN IF NOT EXISTS store_transaction_id TEXT,
    ADD COLUMN IF NOT EXISTS store TEXT;

-- Index for fast IAP duplicate checks
CREATE INDEX IF NOT EXISTS idx_purchases_store_transaction
    ON public.purchases(store_transaction_id) WHERE store_transaction_id IS NOT NULL;

COMMIT;
