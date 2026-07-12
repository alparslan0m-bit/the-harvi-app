-- 20260712194900_fix_redeem_lock.sql
-- Description: Fix redeem_access_code by changing SKIP LOCKED to just FOR UPDATE
-- to block and process concurrent redemption requests properly instead of failing.

BEGIN;

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

COMMIT;
