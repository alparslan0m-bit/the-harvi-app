-- 20260501000005_admin_helpers.sql
BEGIN;

-- Mark a module as permanently free
CREATE OR REPLACE FUNCTION public.admin_grant_free_module(
    p_module_id UUID,
    p_notes     TEXT DEFAULT NULL
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
    INSERT INTO public.free_modules (module_id, notes)
    VALUES (p_module_id, p_notes)
    ON CONFLICT (module_id) DO UPDATE SET notes = EXCLUDED.notes;
END;
$$;

-- Remove free status from a module (reverts to paid)
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
    DELETE FROM public.free_modules WHERE module_id = p_module_id;
END;
$$;

-- Mark a subject as permanently free (preview hook)
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
    INSERT INTO public.free_subjects (subject_id, notes)
    VALUES (p_subject_id, p_notes)
    ON CONFLICT (subject_id) DO UPDATE SET notes = EXCLUDED.notes;
END;
$$;

-- Process a refund: mark purchase as refunded (access revoked immediately)
CREATE OR REPLACE FUNCTION public.admin_refund_purchase(p_purchase_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    UPDATE public.purchases
    SET status = 'refunded', updated_at = now()
    WHERE id = p_purchase_id;
END;
$$;

-- Dashboard: revenue summary
CREATE OR REPLACE FUNCTION public.admin_get_revenue_summary()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        CASE 
            WHEN NOT public.is_admin() THEN jsonb_build_object('error', 'Unauthorized')
            ELSE (
                SELECT jsonb_build_object(
                    'total_revenue_cents',
                        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'active'), 0),
                    'total_purchases',
                        COUNT(*) FILTER (WHERE status = 'active'),
                    'refunded_amount_cents',
                        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'refunded'), 0),
                    'paying_students',
                        COUNT(DISTINCT user_id) FILTER (WHERE status = 'active')
                ) FROM public.purchases
            )
        END;
$$;

COMMIT;
