# Harvi RLS Security Audit Skill

## How to Use This Document

Run through every section top-to-bottom before any production deploy, after any migration change, and after any Edge Function change. Every item is actionable — no theoretical notes.

---

## Part 1 — Confirmed Vulnerabilities Found in This Codebase

These are real bugs found by auditing the current migration files. Fix them before going live.

---

### CRIT-01 — `is_admin()` Reads a Client-Controllable JWT Claim

**File:** `supabase/migrations/20260510000001_unified_rls_policies.sql`

**Vulnerable code:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT (auth.jwt() ->> 'role' = 'service_role')   -- ← EXPLOITABLE
    OR (EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = (SELECT auth.uid())
      AND (raw_app_meta_data ->> 'role' = 'admin')
    ))
  );
END;
$$;
```

**Why it's dangerous:** The `auth.jwt()` payload is signed by your Supabase JWT secret, but the **claims inside are set by whoever mints the token**. If a developer ever mints a JWT with `role: service_role` in the payload (easy to do with the service role key during testing), that user permanently bypasses every admin check. The `service_role` designation lives in the *connection*, not the JWT payload — reading it from `jwt()` is meaningless and misleading.

**Fix:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (raw_app_meta_data ->> 'role') = 'admin'
     FROM auth.users
     WHERE id = (SELECT auth.uid())),
    false
  );
$$;
```

Only `raw_app_meta_data` is writable exclusively by the service role. A client JWT cannot forge it.

---

### CRIT-02 — `create-checkout` Edge Function Auto-Activates Purchases Without Payment

**File:** `supabase/functions/create-checkout/index.ts`

**Vulnerable code:**
```typescript
await supabaseAdmin.from("purchases").insert({
  user_id: user.id,
  module_id: module_id || null,
  subject_id: subject_id || null,
  payment_session_id: paymentSessionId,
  amount_cents: item.price_cents,
  currency: "usd",
  status: "active",  // ← inserted as active immediately, no payment taken
  provider: "manual",
});

const checkoutUrl = `${success_url}?session_id=${paymentSessionId}`;
```

**Why it's dangerous:** Any authenticated user can call this Edge Function and receive `status: "active"` access to paid content without paying a single cent. The function generates a `manual_<uuid>` session ID and immediately marks the purchase active.

**Fix — two-step pattern:**
```typescript
// Step 1: Insert as PENDING only
await supabaseAdmin.from("purchases").insert({
  user_id: user.id,
  module_id: module_id || null,
  subject_id: subject_id || null,
  payment_session_id: sessionId,    // real provider session ID
  amount_cents: item.price_cents,
  currency: "usd",
  status: "pending",               // ← never "active" until payment confirmed
  provider: "stripe",              // or "paymob" — never "manual" in production
});

// Step 2: Return the real provider checkout URL
return new Response(JSON.stringify({ url: providerCheckoutUrl }), { status: 200 });
// Status only moves to "active" via the webhook after payment confirmation.
```

If you need a dev/test bypass, gate it explicitly:
```typescript
if (Deno.env.get("ENVIRONMENT") === "development") {
  // dev bypass only — never runs in production
}
```

---

### CRIT-03 — `payment-webhook` Skips HMAC Verification

**File:** `supabase/functions/payment-webhook/index.ts`

**Vulnerable code:**
```typescript
// Example Paymob logic:
// const hmac = req.headers.get("x-paymob-hmac");
// if (!verifyPaymobHmac(body, hmac)) throw new Error("Invalid signature");
```

**Why it's dangerous:** Anyone on the internet can POST to your webhook URL and activate purchases for arbitrary users at zero cost. Webhooks are public URLs — signature verification is the **only** thing that proves the request came from your payment provider.

**Fix (Paymob HMAC pattern):**
```typescript
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

async function verifyPaymobHmac(body: Record<string, unknown>, receivedHmac: string): Promise<boolean> {
  const secret = Deno.env.get("PAYMOB_HMAC_SECRET")!;
  // Paymob concatenates specific fields in alphabetical order
  const fields = ["amount_cents","created_at","currency","error_occured",
    "has_parent_transaction","id","integration_id","is_3d_secure","is_auth",
    "is_capture","is_refunded","is_standalone_payment","is_voided","order",
    "owner","pending","source_data.pan","source_data.sub_type","source_data.type","success"];
  const str = fields.map(f => body[f] ?? "").join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(str));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,"0")).join("");
  return computed === receivedHmac;
}

// In handler:
const body = await req.json();
const hmac = req.headers.get("x-paymob-hmac") ?? "";
if (!(await verifyPaymobHmac(body.obj ?? body, hmac))) {
  console.error("[Webhook] HMAC verification failed — rejecting");
  return new Response("Unauthorized", { status: 401 });
}
```

---

### HIGH-01 — `check_content_access()` Uses Unwrapped `auth.uid()` in One Version

**File:** `supabase/migrations/legacy/20260501000007_unified_purchase_logic.sql`

**Vulnerable code:**
```sql
EXISTS (
    SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid()  -- ← O(N) per row
    AND p.subject_id = s.id AND p.status = 'active'
)
```

**Impact:** On a table with 10,000 questions, Postgres evaluates `auth.uid()` 10,000 times instead of once. This causes query timeouts under load and can be used to DoS the database.

**Fix — always wrap in `(SELECT ...)`:**
```sql
EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.user_id = (SELECT auth.uid())  -- ← evaluated once, O(1)
    AND p.subject_id = s.id
    AND p.status = 'active'
)
```

The canonical `check_content_access()` in `20260501000001_access_function.sql` does this correctly. The re-definition in `20260501000007` overwrites it with the broken version. **Delete the function definition from `_007` and only keep it in `_001`.**

---

### HIGH-02 — Duplicate Policy Names Break Idempotent Deploys

**File:** `supabase/migrations/20260510000001_unified_rls_policies.sql`

**Vulnerable code:**
```sql
CREATE POLICY "Admins have full access" ON public.years ...
CREATE POLICY "Admins have full access" ON public.modules ...   -- same name, different table
CREATE POLICY "Admins have full access" ON public.subjects ...  -- Postgres allows this
```

Postgres allows identical names across *different* tables, but the pattern breaks when you `DROP POLICY IF EXISTS "Admins have full access" ON public.years` — you must specify the table, and automation scripts often forget. More critically, the policy DROP loop at the top of the same file:

```sql
DO $$ 
DECLARE pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;
```

This drops **all** existing policies across the entire schema before re-creating. If this migration fails mid-run after the DROP loop but before recreating policies, your database is left with **zero RLS policies** on all tables — full data exposure until you fix and re-run.

**Fix:** Use explicit DROP + CREATE per policy, wrapped in a single transaction:
```sql
BEGIN;
DROP POLICY IF EXISTS "admins_years_all"   ON public.years;
DROP POLICY IF EXISTS "admins_modules_all" ON public.modules;
-- ... explicit drops ...
CREATE POLICY "admins_years_all"   ON public.years   FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "admins_modules_all" ON public.modules FOR ALL TO authenticated USING (is_admin());
-- ... explicit creates ...
COMMIT;
```

Name policies with `table_operation` format, never generic names shared across tables.

---

### MEDIUM-01 — `pwa_installs` Table Has No Policies in the Unified RLS File

**File:** `supabase/migrations/20260510000001_unified_rls_policies.sql`

The file enables RLS on `pwa_installs` is NOT in the list. A separate migration (`20260420000003_security_hardening.sql`) adds a policy, but the unified file's DROP ALL loop will remove it without replacing it — leaving `pwa_installs` with RLS enabled but zero policies, which means **no authenticated user can insert or read**.

**Fix:** Add to the unified file:
```sql
ALTER TABLE public.pwa_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pwa_installs_self_insert" ON public.pwa_installs;
CREATE POLICY "pwa_installs_self_insert"
    ON public.pwa_installs FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);
```

---

### MEDIUM-02 — `get_content_access_map()` Returns Data for All Users With No Admin Guard

**File:** `supabase/migrations/legacy/20260501000007_unified_purchase_logic.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_content_access_map()
RETURNS TABLE (item_id UUID, item_type TEXT, has_access BOOLEAN, is_free BOOLEAN, price_cents INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER ...
AS $$
    -- Admin: Full Access
    SELECT id, 'module', true, is_free, price_cents FROM public.modules WHERE is_admin()
    UNION ALL
    -- Non-Admin: Modules
    SELECT m.id, 'module', (...), m.is_free, m.price_cents FROM public.modules m WHERE NOT is_admin()
```

The `WHERE is_admin()` / `WHERE NOT is_admin()` pattern means if `is_admin()` returns true (e.g., due to CRIT-01), the admin branch returns `has_access = true` for every module for every user. After fixing CRIT-01, this becomes safe — but worth noting.

Additionally, `SECURITY DEFINER` functions are callable by any authenticated user. This function reveals `price_cents` for all content to all users. This is probably intentional (to show prices in UI), but confirm it's acceptable.

---

### LOW-01 — Feedback Table Allows Anonymous Inserts With No Rate Limiting

**Files:** Multiple policy files

```sql
CREATE POLICY "Self Insert" ON public.feedback FOR INSERT TO authenticated, anon
    WITH CHECK (((SELECT auth.uid()) = user_id) OR (user_id IS NULL));
```

Anonymous users (`anon` role) can insert feedback with `user_id = NULL`. There is no rate limiting at the RLS layer. At scale this becomes a spam vector.

**Mitigation options (pick one):**
- Restrict to `authenticated` only: `TO authenticated` (break anonymous feedback)
- Add a `ip_hash` column and a partial unique index: `UNIQUE (ip_hash, created_at::date)` (rate-limit by day)
- Handle in Edge Function with IP-based throttle instead

---

## Part 2 — RLS Architecture Audit Checklist

Run these SQL queries in Supabase SQL Editor. Every query should return the expected result before deploying.

### 2.1 — Every Public Table Has RLS Enabled

```sql
SELECT tablename, rowsecurity,
    CASE WHEN rowsecurity THEN '✅ RLS ON' ELSE '🚨 RLS OFF — IMMEDIATE RISK' END AS status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity ASC, tablename;
-- Expected: ALL rows show rowsecurity = true
-- Any false = data fully exposed via REST API
```

### 2.2 — No Policy Uses Bare `auth.uid()` (O(N) Scan Check)

```sql
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  AND (qual NOT LIKE '%(SELECT auth.uid())%' AND with_check NOT LIKE '%(SELECT auth.uid())%');
-- Expected: 0 rows
-- Any rows = O(N) performance vulnerability in that policy
```

### 2.3 — Purchases Table Has No Client-Writable Policies

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'purchases'
  AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
  AND 'authenticated' = ANY(roles);
-- Expected: 0 rows (only service_role inserts/updates purchases)
-- Any row = clients can fraudulently insert or modify purchase records
```

### 2.4 — Questions Table Is Gated (Anonymous Gets 0 Rows)

```sql
-- Simulate anon role
SET LOCAL ROLE anon;
SELECT COUNT(*) FROM public.questions;
-- Expected: 0
RESET ROLE;
```

### 2.5 — Every RLS Policy Column Has a Supporting Index

```sql
SELECT
    t.tablename,
    c.column_name,
    CASE WHEN i.indexname IS NOT NULL THEN '✅ indexed' ELSE '🚨 MISSING INDEX' END AS status
FROM (VALUES
    ('purchases',         'user_id'),
    ('purchases',         'module_id'),
    ('purchases',         'status'),
    ('purchases',         'subject_id'),
    ('subjects',          'module_id'),
    ('lectures',          'subject_id'),
    ('questions',         'lecture_id'),
    ('quiz_results',      'user_id'),
    ('feedback',          'user_id'),
    ('lecture_statistics','lecture_id'),
    ('profiles',          'id')
) AS c(tablename, column_name)
JOIN pg_tables t ON t.tablename = c.tablename AND t.schemaname = 'public'
LEFT JOIN pg_indexes i
    ON i.tablename = c.tablename AND i.schemaname = 'public'
    AND i.indexdef LIKE '%' || c.column_name || '%';
-- Expected: ALL rows show ✅ indexed
```

### 2.6 — `SECURITY DEFINER` Functions Are Owned by `postgres`

```sql
SELECT routine_name, security_type, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND security_type = 'DEFINER'
ORDER BY routine_name;
-- Verify: check_content_access, get_content_access_map, is_admin, get_module_access_map
-- are all SECURITY DEFINER and owned by a superuser, not by an authenticated user.
```

Check ownership:
```sql
SELECT p.proname, r.rolname AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN ('check_content_access','is_admin','get_content_access_map','get_module_access_map');
-- Expected: owner = 'postgres' or your superuser role
-- If owner = 'anon' or 'authenticated': CRITICAL — function can be dropped/replaced by a user
```

### 2.7 — `is_admin()` Cannot Be Spoofed

```sql
-- Attempt to spoof admin via JWT claim (should return false)
SELECT auth.jwt() ->> 'role';  -- Should be null or 'authenticated', never 'service_role' for a real user JWT

-- Direct check
SELECT public.is_admin();  -- Run as a non-admin authenticated user
-- Expected: false
```

### 2.8 — No Table Has Policies With `USING (true)` for Write Operations

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true'
  AND cmd IN ('INSERT','UPDATE','DELETE','ALL');
-- Expected: 0 rows (USING(true) on writes = anyone can modify all rows)
```

### 2.9 — Admin Helper Functions Reject Non-Admins

```sql
-- As a regular authenticated user (not admin):
SELECT public.admin_grant_free_module(gen_random_uuid());
-- Expected: ERROR: Unauthorized

SELECT public.admin_refund_purchase(gen_random_uuid());
-- Expected: ERROR: Unauthorized
```

---

## Part 3 — Edge Function Security Audit

### 3.1 — `create-checkout` Checklist

```
[ ] status is inserted as 'pending', never 'active'
[ ] provider is never 'manual' in production (gate behind ENVIRONMENT check)
[ ] user_id in purchase record comes from JWT (supabaseAnon.auth.getUser()), never from request body
[ ] module_id/subject_id are validated against DB before inserting — no phantom IDs
[ ] existing active purchase is checked before creating a new session (no double-purchase)
[ ] CORS origin is APP_URL env var, not '*'
[ ] Authorization header is required — return 401 if missing
[ ] Response never includes the service role key or any internal secret
```

### 3.2 — `payment-webhook` / `stripe-webhook` Checklist

```
[ ] Signature verification runs BEFORE any DB operation
[ ] Signature verification uses raw body text (not parsed JSON)
[ ] On verification failure: log error type only, return 401, do NOT log body
[ ] activatePurchase() includes user_id guard: .eq("user_id", userId) prevents cross-user activation
[ ] activatePurchase() is idempotent — duplicate webhook calls do not create duplicate active records
[ ] Disputed purchases set status = 'disputed' (not 'active'), revoking access
[ ] Refunds set status = 'refunded', revoking access immediately
[ ] ENVIRONMENT variable gates any dev bypass logic
```

### 3.3 — `verify-purchase` Checklist

```
[ ] user_id from JWT is matched against session metadata user_id — prevents session hijacking
[ ] DB lookup uses .eq("user_id", user.id) — user can only verify their own sessions
[ ] Stripe session retrieval uses service role, not anon key
[ ] If session.payment_status !== 'paid': return status 'pending', do NOT activate
[ ] Function is idempotent — safe to call multiple times for same session_id
```

---

## Part 4 — Migration Integrity Checks

Run before applying any new migration:

### 4.1 — Confirm Canonical `check_content_access` Is Active

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'check_content_access' AND pronamespace = 'public'::regnamespace;
-- Inspect the body and confirm:
-- 1. Uses (SELECT auth.uid()), not auth.uid()
-- 2. References s.is_free and m.is_free (NOT free_subjects/free_modules tables — those were dropped)
-- 3. Has SET search_path = public
-- 4. Is SECURITY DEFINER
```

### 4.2 — Confirm Table Schema Is the New Baseline (is_free Columns Exist)

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('modules','subjects')
  AND column_name IN ('is_free','price_cents','external_price_id')
ORDER BY table_name, column_name;
-- Expected: 6 rows (3 columns × 2 tables)
-- If 0 rows: old schema — free_modules/free_subjects tables are still in use
```

### 4.3 — Confirm Dropped Tables Are Gone

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('free_modules','free_subjects','module_prices');
-- Expected: 0 rows (these were consolidated into columns in _007 + _008 migrations)
-- If rows exist: check_content_access() in unified policy is pointing at the right schema
```

### 4.4 — No Missing RLS Coverage on Any Table

```sql
-- Tables with RLS ON but zero policies (locked out — no one can read)
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = t.tablename
  );
-- Expected: 0 rows
-- Any rows = that table is completely inaccessible to all users
```

---

## Part 5 — Behavioral Tests (Run in SQL Editor)

### Full Access Test Matrix

Set up test users first:
```sql
-- Replace with real UUIDs from auth.users
\set anon_uid    '00000000-0000-0000-0000-000000000000'
\set free_uid    '<authenticated-user-no-purchases>'
\set paid_uid    '<authenticated-user-with-active-purchase>'
\set module_id   '<a-paid-module-uuid>'
\set lecture_id  '<a-lecture-in-that-module>'
```

```sql
-- TEST 1: Anon cannot read questions
SET ROLE anon;
SELECT COUNT(*) FROM public.questions;
-- Expected: 0
RESET ROLE;

-- TEST 2: Authenticated user with no purchases cannot read paid questions
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<free_uid>","role":"authenticated"}';
SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
JOIN public.subjects s ON s.id = l.subject_id
WHERE s.module_id = '<module_id>';
-- Expected: 0
RESET ROLE;

-- TEST 3: Authenticated user with active purchase can read questions
-- (Insert active purchase first)
INSERT INTO public.purchases (user_id, module_id, payment_session_id, amount_cents, status, provider)
VALUES ('<paid_uid>', '<module_id>', 'test_session_001', 999, 'active', 'test');

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<paid_uid>","role":"authenticated"}';
SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
JOIN public.subjects s ON s.id = l.subject_id
WHERE s.module_id = '<module_id>';
-- Expected: > 0
RESET ROLE;

-- TEST 4: Refunded purchase immediately revokes access
UPDATE public.purchases SET status = 'refunded'
WHERE user_id = '<paid_uid>' AND module_id = '<module_id>';

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<paid_uid>","role":"authenticated"}';
SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
JOIN public.subjects s ON s.id = l.subject_id
WHERE s.module_id = '<module_id>';
-- Expected: 0
RESET ROLE;

-- TEST 5: Client cannot insert into purchases
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<free_uid>","role":"authenticated"}';
INSERT INTO public.purchases (user_id, module_id, payment_session_id, amount_cents, status, provider)
VALUES ('<free_uid>', '<module_id>', 'fake_session', 0, 'active', 'manual');
-- Expected: ERROR (permission denied — no INSERT policy for authenticated)
RESET ROLE;

-- TEST 6: Client cannot read another user's purchases
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<free_uid>","role":"authenticated"}';
SELECT * FROM public.purchases WHERE user_id = '<paid_uid>';
-- Expected: 0 rows
RESET ROLE;

-- TEST 7: is_admin() cannot be spoofed via JWT claim
-- Craft a JWT with role=service_role in the payload
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<free_uid>","role":"service_role"}';
SELECT public.is_admin();
-- Expected: false (if CRIT-01 is fixed)
RESET ROLE;

-- TEST 8: Free module is accessible to all authenticated users
UPDATE public.modules SET is_free = true WHERE id = '<module_id>';

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<free_uid>","role":"authenticated"}';
SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
JOIN public.subjects s ON s.id = l.subject_id
WHERE s.module_id = '<module_id>';
-- Expected: > 0
RESET ROLE;

-- Restore
UPDATE public.modules SET is_free = false WHERE id = '<module_id>';
```

---

## Part 6 — Pre-Deploy Sign-Off Checklist

Complete this in full before every production deploy.

### Database Layer

```
[ ] CRIT-01 fixed: is_admin() reads raw_app_meta_data only, not jwt() claims
[ ] CRIT-02 fixed: create-checkout inserts status='pending', no 'manual' provider in prod
[ ] CRIT-03 fixed: payment-webhook verifies HMAC signature before any DB operation
[ ] HIGH-01 fixed: all check_content_access() definitions use (SELECT auth.uid())
[ ] HIGH-02 fixed: migration DROP loop replaced with explicit per-policy DROP/CREATE
[ ] MEDIUM-01 fixed: pwa_installs policies included in unified RLS file
[ ] Section 2 queries all pass (0 unexpected rows)
[ ] Section 4 migration integrity queries all pass
[ ] All 8 behavioral tests in Section 5 return expected results
```

### Edge Functions

```
[ ] No 'manual' provider or auto-activation in create-checkout
[ ] Webhook signature verification uncommented and tested
[ ] All functions use APP_URL for CORS, not '*'
[ ] Service role key is a Deno env secret, never in source code or logs
[ ] ENVIRONMENT variable gates any dev-only bypass logic
[ ] Tested locally with `supabase functions serve` against real webhook events
```

### Deployment Sequence

```
1. Apply migrations in numeric order — never skip, never re-order
2. Run Section 2 SQL queries immediately after migration apply
3. Deploy Edge Functions: supabase functions deploy <name>
4. Set all secrets: supabase secrets set KEY=value
5. Register webhook URL with payment provider, confirm test event received
6. Run Section 5 behavioral tests against production DB
7. Monitor Supabase logs for 15 minutes after deploy for 403/500 spikes
```

---

## Part 7 — Ongoing Monitoring Queries

Run weekly or after any content/user changes.

```sql
-- Suspicious: pending purchases older than 24 hours (webhook may have failed)
SELECT p.id, u.email, m.name AS module, p.payment_session_id, p.created_at,
    NOW() - p.created_at AS age
FROM public.purchases p
JOIN auth.users u ON u.id = p.user_id
JOIN public.modules m ON m.id = p.module_id
WHERE p.status = 'pending' AND p.created_at < NOW() - INTERVAL '24 hours'
ORDER BY p.created_at;

-- Suspicious: same payment_session_id used more than once
SELECT payment_session_id, COUNT(*) AS count
FROM public.purchases
GROUP BY payment_session_id
HAVING COUNT(*) > 1;

-- Active purchases by module (revenue health check)
SELECT m.name, COUNT(*) AS paying_students,
    SUM(p.amount_cents) / 100.0 AS revenue_usd
FROM public.purchases p
JOIN public.modules m ON m.id = p.module_id
WHERE p.status = 'active'
GROUP BY m.name ORDER BY revenue_usd DESC;

-- Users with access via free flag (not purchases) — confirm expected
SELECT COUNT(*) AS free_access_users,
    COUNT(*) FILTER (WHERE m.is_free) AS via_free_module,
    COUNT(*) FILTER (WHERE s.is_free) AS via_free_subject
FROM public.lectures l
JOIN public.subjects s ON s.id = l.subject_id
JOIN public.modules m ON m.id = s.module_id
WHERE m.is_free OR s.is_free;
```

---

## Quick Reference — Vulnerability Severity Key

| Label | Action Required |
|-------|----------------|
| `CRIT` | Fix before any data is in production. Exploitable by any authenticated user. |
| `HIGH` | Fix before going live. Causes data leaks or severe performance degradation under load. |
| `MEDIUM` | Fix before 100+ users. Causes incorrect behavior in edge cases. |
| `LOW` | Fix before 1,000+ users. Operational risk at scale. |
