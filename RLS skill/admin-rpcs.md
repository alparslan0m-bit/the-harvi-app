# Reference: Admin RPCs & Dashboard

These RPCs are called from an admin dashboard (web app or Supabase Studio).
All require `is_admin = true` on the calling user's profile, enforced server-side.

---

## Toggling Free Content

```sql
-- Make an entire module free (growth hook)
SELECT public.admin_grant_free_module(
    '<module-uuid>',
    'Year 1 Module 1 — always free for acquisition'
);

-- Make just the first subject of a paid module free (preview strategy)
SELECT public.admin_grant_free_subject(
    '<subject-uuid>',
    'Preview: first lecture of Cardiovascular module'
);

-- Revoke free status (module becomes paid again)
SELECT public.admin_revoke_free_module('<module-uuid>');

-- List all currently free modules
SELECT
    fm.module_id,
    m.name AS module_name,
    fm.notes,
    fm.created_at
FROM public.free_modules fm
JOIN public.modules m ON m.id = fm.module_id
ORDER BY fm.created_at DESC;

-- List all currently free subjects
SELECT
    fs.subject_id,
    s.name AS subject_name,
    m.name AS parent_module,
    fs.notes,
    fs.created_at
FROM public.free_subjects fs
JOIN public.subjects s ON s.id = fs.subject_id
JOIN public.modules m ON m.id = s.module_id
ORDER BY m.name, s.name;
```

---

## Revenue Dashboard

```sql
-- Overall revenue summary
SELECT
    COUNT(*) FILTER (WHERE status = 'active')              AS total_sales,
    SUM(amount_cents) FILTER (WHERE status = 'active')     AS total_revenue_cents,
    SUM(amount_cents) FILTER (WHERE status = 'refunded')   AS refunded_cents,
    COUNT(DISTINCT user_id) FILTER (WHERE status = 'active') AS paying_students,
    COUNT(*) FILTER (WHERE status = 'pending')             AS pending_payments
FROM public.purchases;

-- Revenue per module
SELECT
    m.name AS module_name,
    COUNT(*) FILTER (WHERE p.status = 'active')         AS sales,
    SUM(p.amount_cents) FILTER (WHERE p.status = 'active') AS revenue_cents,
    AVG(p.amount_cents) FILTER (WHERE p.status = 'active') AS avg_price_cents
FROM public.modules m
LEFT JOIN public.purchases p ON p.module_id = m.id
GROUP BY m.id, m.name
ORDER BY revenue_cents DESC NULLS LAST;

-- Daily sales trend (last 30 days)
SELECT
    created_at::DATE AS sale_date,
    COUNT(*) FILTER (WHERE status = 'active')         AS sales,
    SUM(amount_cents) FILTER (WHERE status = 'active') AS revenue_cents
FROM public.purchases
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;

-- Students who bought multiple modules (power users)
SELECT
    user_id,
    COUNT(*) AS modules_purchased,
    SUM(amount_cents) AS total_spent_cents,
    MIN(created_at) AS first_purchase
FROM public.purchases
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY total_spent_cents DESC;
```

---

## Module Pricing Management

```sql
-- Add or update a module's price
-- Run this AFTER creating the product/price in Stripe Dashboard
INSERT INTO public.module_prices (
    module_id,
    stripe_product_id,
    stripe_price_id,
    amount_cents,
    currency
)
VALUES (
    '<module-uuid>',
    'prod_xxxxx',
    'price_xxxxx',
    999,           -- $9.99
    'usd'
)
ON CONFLICT (module_id) DO UPDATE SET
    stripe_price_id = EXCLUDED.stripe_price_id,
    amount_cents = EXCLUDED.amount_cents,
    is_active = true;

-- Deactivate a module from purchase (keep existing access, stop new sales)
UPDATE public.module_prices
SET is_active = false
WHERE module_id = '<module-uuid>';

-- List all priced modules
SELECT
    m.name,
    mp.amount_cents,
    mp.currency,
    mp.stripe_price_id,
    mp.is_active,
    COALESCE(fm.module_id IS NOT NULL, false) AS is_free
FROM public.modules m
LEFT JOIN public.module_prices mp ON mp.module_id = m.id
LEFT JOIN public.free_modules fm ON fm.module_id = m.id
ORDER BY m.name;
```

---

## Refund Processing

```sql
-- Refund a purchase (after processing in Stripe)
-- This immediately revokes access via RLS
SELECT public.admin_refund_purchase('<purchase-uuid>');

-- Or directly (same effect):
UPDATE public.purchases
SET status = 'refunded', updated_at = now()
WHERE id = '<purchase-uuid>';

-- Find purchases for a specific user
SELECT
    p.id,
    m.name AS module_name,
    p.amount_cents,
    p.status,
    p.stripe_session_id,
    p.created_at
FROM public.purchases p
JOIN public.modules m ON m.id = p.module_id
WHERE p.user_id = '<user-uuid>'
ORDER BY p.created_at DESC;
```

---

## Security Monitoring

```sql
-- Purchases with suspicious patterns (same session_id used twice)
SELECT stripe_session_id, COUNT(*) AS count
FROM public.purchases
GROUP BY stripe_session_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (UNIQUE constraint should prevent this)

-- Pending purchases older than 24 hours (payment abandoned or webhook missed)
SELECT
    p.id,
    u.email,
    m.name AS module_name,
    p.stripe_session_id,
    p.created_at,
    NOW() - p.created_at AS age
FROM public.purchases p
JOIN auth.users u ON u.id = p.user_id
JOIN public.modules m ON m.id = p.module_id
WHERE p.status = 'pending'
  AND p.created_at < NOW() - INTERVAL '24 hours'
ORDER BY p.created_at;
-- Review these manually — may need to check Stripe for status

-- Active purchases by module (for analytics)
SELECT
    module_id,
    COUNT(*) AS active_students
FROM public.purchases
WHERE status = 'active'
GROUP BY module_id
ORDER BY active_students DESC;
```

---

## Growth Hacking Playbook

Recommended free tier configuration to maximize conversion:

```sql
-- Strategy: "First module free, first subject of every paid module free"

-- 1. Mark the introductory/Year 1 module as fully free
SELECT public.admin_grant_free_module(
    '<year-1-module-1-uuid>',
    'Acquisition hook: full free access to Year 1 Module 1'
);

-- 2. For every other module, free the first subject
-- Run this once after content is imported
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT ON (s.module_id) s.id AS subject_id, s.module_id
        FROM public.subjects s
        JOIN public.modules m ON m.id = s.module_id
        WHERE m.id NOT IN (SELECT module_id FROM public.free_modules)
        ORDER BY s.module_id, s.order ASC
    LOOP
        INSERT INTO public.free_subjects (subject_id, notes)
        VALUES (r.subject_id, 'Auto: preview first subject of paid module')
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;
```
