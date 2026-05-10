# Reference: Full SQL Migrations

All migrations are idempotent (safe to re-run). Apply in numeric order.

---

## Migration 1 — Entitlements Schema

```sql
-- 20260501000000_entitlements_schema.sql
BEGIN;

-- ============================================================
-- PURCHASES TABLE
-- Append-only. Never updated by the client. 
-- Source of truth for all paid access.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchases (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id     UUID        NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    stripe_session_id   TEXT NOT NULL,           -- Stripe Checkout Session ID
    stripe_payment_intent TEXT,                   -- Set after payment confirmed
    amount_cents  INTEGER     NOT NULL,
    currency      TEXT        NOT NULL DEFAULT 'usd',
    status        TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'active', 'refunded', 'disputed')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, module_id, stripe_session_id)  -- Idempotency guard
);

-- ============================================================
-- FREE MODULES TABLE
-- Admin-controlled. A module here = free for ALL users.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.free_modules (
    module_id     UUID        PRIMARY KEY REFERENCES public.modules(id) ON DELETE CASCADE,
    notes         TEXT,                           -- Admin note: "Q1 2025 promo" etc.
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FREE SUBJECTS TABLE  
-- Admin-controlled. A subject here = free for ALL users,
-- even if its parent module is paid.
-- Use for: preview first subject of each module (growth hack).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.free_subjects (
    subject_id    UUID        PRIMARY KEY REFERENCES public.subjects(id) ON DELETE CASCADE,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE PRICES TABLE
-- Stores the price for each module.
-- Supports per-module pricing and Stripe Product/Price IDs.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.module_prices (
    module_id           UUID    PRIMARY KEY REFERENCES public.modules(id) ON DELETE CASCADE,
    stripe_product_id   TEXT    NOT NULL,
    stripe_price_id     TEXT    NOT NULL,
    amount_cents        INTEGER NOT NULL,
    currency            TEXT    NOT NULL DEFAULT 'usd',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
```

---

## Migration 2 — Access Function (SECURITY DEFINER)

```sql
-- 20260501000001_access_function.sql
BEGIN;

-- ============================================================
-- check_content_access(p_lecture_id)
-- 
-- SECURITY DEFINER: runs as DB owner, bypassing RLS on
-- internal entitlement tables (purchases, free_modules, etc.)
-- This is intentional — entitlement tables must NOT be
-- visible to the client directly.
--
-- Returns TRUE if the calling user may read this lecture's questions.
-- Used as the single source of truth in all content RLS policies.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_content_access(p_lecture_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public   -- Prevents search_path injection attacks
AS $$
    -- Step 1: Is the lecture's subject explicitly free?
    SELECT EXISTS (
        SELECT 1 FROM public.free_subjects fs
        JOIN public.lectures l ON l.subject_id = fs.subject_id
        WHERE l.id = p_lecture_id
    )
    OR
    -- Step 2: Is the lecture's module explicitly free?
    EXISTS (
        SELECT 1 FROM public.free_modules fm
        JOIN public.subjects s ON s.module_id = fm.module_id
        JOIN public.lectures l ON l.subject_id = s.id
        WHERE l.id = p_lecture_id
    )
    OR
    -- Step 3: Does the authenticated user have an active purchase
    --         for the module that contains this lecture?
    EXISTS (
        SELECT 1 FROM public.purchases p
        JOIN public.subjects s ON s.module_id = p.module_id
        JOIN public.lectures l ON l.subject_id = s.id
        WHERE l.id = p_lecture_id
          AND p.user_id = (SELECT auth.uid())   -- O(1): evaluated once
          AND p.status = 'active'
    );
$$;

-- ============================================================
-- get_module_access_map(p_user_id)
-- 
-- Returns one row per module with has_access and is_free flags.
-- Used by the client to render lock icons without exposing
-- the purchases table.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_module_access_map(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    module_id   UUID,
    has_access  BOOLEAN,
    is_free     BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        m.id AS module_id,
        (
            fm.module_id IS NOT NULL   -- explicitly free
            OR p.module_id IS NOT NULL -- user purchased it
        ) AS has_access,
        (fm.module_id IS NOT NULL) AS is_free
    FROM public.modules m
    LEFT JOIN public.free_modules fm ON fm.module_id = m.id
    LEFT JOIN public.purchases p
        ON p.module_id = m.id
        AND p.user_id = COALESCE(p_user_id, (SELECT auth.uid()))
        AND p.status = 'active';
$$;

-- ============================================================
-- is_admin()
-- 
-- Helper used in admin-only policies.
-- Reads from profiles.is_admin which only the service role
-- can set to true.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())),
        false
    );
$$;

COMMIT;
```

---

## Migration 3 — RLS on Content Tables

```sql
-- 20260501000002_rls_content_tables.sql
BEGIN;

-- ============================================================
-- YEARS — public read (no purchase required to browse structure)
-- ============================================================
ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "years_public_read" ON public.years;
CREATE POLICY "years_public_read"
    ON public.years FOR SELECT
    TO authenticated, anon
    USING (true);   -- Structure is always visible; questions are gated


-- ============================================================
-- MODULES — public read (show lock icons in UI)
-- ============================================================
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_public_read" ON public.modules;
CREATE POLICY "modules_public_read"
    ON public.modules FOR SELECT
    TO authenticated, anon
    USING (true);   -- Titles visible; questions gated below


-- ============================================================
-- MODULE_PRICES — authenticated read only
-- ============================================================
ALTER TABLE public.module_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "module_prices_auth_read" ON public.module_prices;
CREATE POLICY "module_prices_auth_read"
    ON public.module_prices FOR SELECT
    TO authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "module_prices_admin_all" ON public.module_prices;
CREATE POLICY "module_prices_admin_all"
    ON public.module_prices FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));


-- ============================================================
-- SUBJECTS — public read
-- ============================================================
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subjects_public_read" ON public.subjects;
CREATE POLICY "subjects_public_read"
    ON public.subjects FOR SELECT
    TO authenticated, anon
    USING (true);


-- ============================================================
-- LECTURES — public read
-- ============================================================
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectures_public_read" ON public.lectures;
CREATE POLICY "lectures_public_read"
    ON public.lectures FOR SELECT
    TO authenticated, anon
    USING (true);


-- ============================================================
-- QUESTIONS — THE CRITICAL GATE
-- This is the only table where RLS enforces payment.
-- Anonymous users see 0 rows.
-- Authenticated users see rows only for lectures they can access.
-- ============================================================
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions_access_gate" ON public.questions;
CREATE POLICY "questions_access_gate"
    ON public.questions FOR SELECT
    TO authenticated
    USING (
        -- Single function call: O(index scan) not O(full scan)
        -- SECURITY DEFINER function handles all three access paths
        (SELECT public.check_content_access(lecture_id))
    );

-- Admin bypass — admins can see all questions
DROP POLICY IF EXISTS "questions_admin_all" ON public.questions;
CREATE POLICY "questions_admin_all"
    ON public.questions FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));


-- ============================================================
-- FREE_MODULES — admin write only, public read
-- ============================================================
ALTER TABLE public.free_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "free_modules_public_read" ON public.free_modules;
CREATE POLICY "free_modules_public_read"
    ON public.free_modules FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "free_modules_admin_write" ON public.free_modules;
CREATE POLICY "free_modules_admin_write"
    ON public.free_modules FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));


-- ============================================================
-- FREE_SUBJECTS — admin write only, public read
-- ============================================================
ALTER TABLE public.free_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "free_subjects_public_read" ON public.free_subjects;
CREATE POLICY "free_subjects_public_read"
    ON public.free_subjects FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "free_subjects_admin_write" ON public.free_subjects;
CREATE POLICY "free_subjects_admin_write"
    ON public.free_subjects FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

COMMIT;
```

---

## Migration 4 — RLS on Purchases

```sql
-- 20260501000003_rls_purchases.sql
BEGIN;

-- ============================================================
-- PURCHASES
--
-- Security model:
-- - Clients can read their OWN purchases (to show "you own this")
-- - Clients CANNOT insert (only Edge Function with service role can)
-- - Clients CANNOT update or delete (ever)
-- - Admin can read all, update status (for refunds)
-- ============================================================
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- User reads their own purchases
DROP POLICY IF EXISTS "purchases_self_read" ON public.purchases;
CREATE POLICY "purchases_self_read"
    ON public.purchases FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- NO INSERT policy for authenticated — only service role (Edge Function) inserts
-- NO UPDATE policy for authenticated — status changes are service role only
-- NO DELETE policy for authenticated — ever

-- Admin full access
DROP POLICY IF EXISTS "purchases_admin_all" ON public.purchases;
CREATE POLICY "purchases_admin_all"
    ON public.purchases FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

COMMIT;
```

---

## Migration 5 — Indexes for RLS Performance

```sql
-- 20260501000004_indexes.sql
BEGIN;

-- Used in check_content_access: free_subjects lookup
CREATE INDEX IF NOT EXISTS idx_free_subjects_subject
    ON public.free_subjects(subject_id);

-- Used in check_content_access: free_modules lookup via subjects→lectures
CREATE INDEX IF NOT EXISTS idx_free_modules_module
    ON public.free_modules(module_id);

-- Used in check_content_access: purchases lookup
CREATE INDEX IF NOT EXISTS idx_purchases_user_module_status
    ON public.purchases(user_id, module_id, status)
    WHERE status = 'active';   -- Partial index — only active rows indexed

-- Used in check_content_access: lecture → subject join
CREATE INDEX IF NOT EXISTS idx_lectures_subject_id
    ON public.lectures(subject_id);

-- Used in check_content_access: subject → module join
CREATE INDEX IF NOT EXISTS idx_subjects_module_id
    ON public.subjects(module_id);

-- Used in purchases self-read policy
CREATE INDEX IF NOT EXISTS idx_purchases_user_id
    ON public.purchases(user_id);

-- Used in module_prices read
CREATE INDEX IF NOT EXISTS idx_module_prices_active
    ON public.module_prices(module_id)
    WHERE is_active = true;

-- Used in get_module_access_map
CREATE INDEX IF NOT EXISTS idx_purchases_user_status
    ON public.purchases(user_id, status)
    WHERE status = 'active';

COMMIT;
```

---

## Migration 6 — Admin Helper RPCs

```sql
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
    SELECT jsonb_build_object(
        'total_revenue_cents',
            SUM(amount_cents) FILTER (WHERE status = 'active'),
        'total_purchases',
            COUNT(*) FILTER (WHERE status = 'active'),
        'pending_purchases',
            COUNT(*) FILTER (WHERE status = 'pending'),
        'refunded_amount_cents',
            COALESCE(SUM(amount_cents) FILTER (WHERE status = 'refunded'), 0),
        'paying_students',
            COUNT(DISTINCT user_id) FILTER (WHERE status = 'active')
    ) FROM public.purchases
    WHERE NOT public.is_admin()
        THEN (SELECT jsonb_build_object('error', 'Unauthorized'))
    ELSE (
        SELECT jsonb_build_object(
            'total_revenue_cents',
                SUM(amount_cents) FILTER (WHERE status = 'active'),
            'total_purchases',
                COUNT(*) FILTER (WHERE status = 'active'),
            'refunded_amount_cents',
                COALESCE(SUM(amount_cents) FILTER (WHERE status = 'refunded'), 0),
            'paying_students',
                COUNT(DISTINCT user_id) FILTER (WHERE status = 'active')
        ) FROM public.purchases
    ) END;
$$;

COMMIT;
```
