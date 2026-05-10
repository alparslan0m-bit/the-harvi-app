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
    payment_session_id  TEXT NOT NULL,           -- Generic Session ID
    payment_id          TEXT,                   -- Generic Transaction ID (e.g. Paymob Order ID)
    provider            TEXT NOT NULL DEFAULT 'manual', -- 'stripe', 'paymob', 'manual'
    amount_cents  INTEGER     NOT NULL,
    currency      TEXT        NOT NULL DEFAULT 'usd',
    status        TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'active', 'refunded', 'disputed')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, module_id, payment_session_id)
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
    external_product_id TEXT,    -- e.g. Paymob integration ID
    external_price_id   TEXT,    -- e.g. Paymob plan ID
    amount_cents        INTEGER NOT NULL,
    currency            TEXT    NOT NULL DEFAULT 'usd',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
