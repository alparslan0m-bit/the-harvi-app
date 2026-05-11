# Harvi RLS Security Audit — v2 (Post-Improvements Re-Audit)

**Audit date:** May 12, 2026  
**Files audited:** `20260510000001_unified_rls_policies.sql`, `20260401000000_harvi_master_baseline.sql`, `create-checkout/index.ts`, `payment-webhook/index.ts`, `verify-purchase/index.ts`

---

## Scorecard — What Changed

| ID            | Severity    | Issue                                                        | Status                   |
| ------------- | ----------- | ------------------------------------------------------------ | ------------------------ |
| CRIT-01       | 🔴 Critical | `is_admin()` read spoofable JWT claim                        | ✅ Fixed                 |
| CRIT-02       | 🔴 Critical | `create-checkout` auto-activated purchases without payment   | ✅ Fixed                 |
| CRIT-03       | 🔴 Critical | `payment-webhook` skipped HMAC verification                  | ✅ Fixed                 |
| HIGH-01       | 🟠 High     | `check_content_access()` used bare `auth.uid()` (O(N) scan)  | ✅ Fixed                 |
| HIGH-02       | 🟠 High     | DROP-all-policies loop left DB exposed on failure            | ✅ Fixed                 |
| LOW-01        | 🟡 Low      | Feedback table allowed anonymous inserts                     | ✅ Fixed                 |
| —             | ➕ New      | `profiles` self-insert policy missing                        | ✅ Fixed                 |
| —             | ➕ New      | Double-purchase prevention in `create-checkout`              | ✅ Added                 |
| —             | ➕ New      | Stale `pending` purchase cleanup before new session          | ✅ Added                 |
| —             | ➕ New      | `activatePurchase()` idempotency guard                       | ✅ Added                 |
| MEDIUM-01     | 🟡 Medium   | `pwa_installs` has no policies in unified RLS file           | ✅ Fixed (Table removed) |
| MEDIUM-NEW-01 | 🟠 High     | Webhook `userId` guard is conditional — can be skipped       | ⚠️ New finding           |
| MEDIUM-NEW-02 | 🟡 Medium   | `verify-purchase` does not validate `module_id` vs DB        | ⚠️ New finding           |
| MEDIUM-NEW-03 | 🟡 Medium   | CORS falls back to `"*"` when `APP_URL` env var is missing   | ⚠️ New finding           |
| LOW-NEW-01    | 🟡 Low      | HMAC comparison not constant-time (timing attack surface)    | ⚠️ New finding           |
| LOW-NEW-02    | 🟡 Low      | `ENVIRONMENT` check is case-sensitive (`"development"` only) | ⚠️ New finding           |
| LOW-NEW-03    | 🟡 Low      | `pg_cron.job` table access not verified as superuser-only    | ⚠️ New finding           |

---

## Part 1 — What Is Now Correct ✅

### CRIT-01 — `is_admin()` — FIXED

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql        -- sql language allows planner inlining
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (raw_app_meta_data ->> 'role') = 'admin'
     FROM auth.users
     WHERE id = (SELECT auth.uid())),   -- O(1) wrapped call
    false                               -- COALESCE prevents NULL bypass
  );
$$;
```

**Verified correct:**

- No longer reads `auth.jwt()` — JWT claim spoofing not possible
- Reads `raw_app_meta_data` which only the service role can write
- `(SELECT auth.uid())` wrapped — evaluated once
- `COALESCE(..., false)` — a NULL user returns false, not NULL (which Postgres treats as falsy in USING but is still a footgun)
- `SET search_path = public` — prevents search_path injection attacks where a malicious schema shadows `auth`
- Language changed from `plpgsql` to `sql` — the planner can inline this at the call site

---

### CRIT-02 — `create-checkout` — FIXED

```typescript
// Step 1: Insert as PENDING
await supabaseAdmin.from("purchases").insert({
  status: "pending",                          // ✅ never "active" on insert
  provider: isDev ? "manual" : "stripe",      // ✅ "manual" gated to dev only
  ...
});

// Step 2: Duplicate check added
if (existing?.status === "active") return 409;

// Step 3: Stale pending cleanup added
if (existing?.status === "pending") {
  await supabaseAdmin.from("purchases")
    .update({ status: "failed" }).eq("id", existing.id);
}

// Step 4: Dev auto-activate gated
if (isDev) { /* auto-activate only in dev */ }
```

**Verified correct:**

- `status: "pending"` on every insert — DB layer backs this up (no INSERT policy for `authenticated` on purchases)
- `"manual"` provider only in dev — production always uses real provider
- Duplicate active purchase returns 409 — no double-charging
- Stale pending records cleaned before creating a new session

---

### CRIT-03 — `payment-webhook` — FIXED

```typescript
if (!isDev) {
  const hmac = req.headers.get("x-paymob-hmac") ?? "";
  const transactionObj = body.obj ?? body;

  if (!hmac || !(await verifyPaymobHmac(transactionObj, hmac))) {
    console.error("[Webhook] HMAC verification failed — rejecting request");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
}
```

**Verified correct:**

- HMAC runs **before** any DB operation — nothing leaks on failure
- Empty HMAC header is also rejected (`!hmac`)
- Full `crypto.subtle` implementation using SHA-512
- Error logging only captures message type, never the raw body (PII protection)

---

### HIGH-01 — `check_content_access()` — FIXED

```sql
EXISTS (SELECT 1 FROM public.purchases p
  WHERE p.user_id = (SELECT auth.uid())   -- ✅ O(1) — evaluated once per query
  AND p.subject_id = s.id
  AND p.status = 'active')
```

Both `EXISTS` blocks (subject-level and module-level) now use `(SELECT auth.uid())`. References `s.is_free` and `m.is_free` columns — the old `free_subjects`/`free_modules` tables are gone.

---

### HIGH-02 — Migration DROP Loop — FIXED

```sql
BEGIN;
-- Explicit per-policy drops — no loop, no blanket erasure
DROP POLICY IF EXISTS "admins_years_all"    ON public.years;
DROP POLICY IF EXISTS "admins_modules_all"  ON public.modules;
-- ... all policies named explicitly ...
CREATE POLICY "admins_years_all" ON public.years FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
-- ...
COMMIT;
```

**Verified correct:**

- Wrapped in `BEGIN/COMMIT` — atomic. Failure mid-run does not leave DB policy-less
- All old generic names (`"Admins have full access"`) also dropped to handle upgrade from previous migration
- New naming convention `table_operation` is unique per table

---

### LOW-01 — Feedback Anonymous Insert — FIXED

```sql
-- Old (vulnerable):
CREATE POLICY "Self Insert" ON public.feedback FOR INSERT TO authenticated, anon ...

-- New (fixed):
CREATE POLICY "feedback_self_insert" ON public.feedback FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

`anon` role removed. Unauthenticated users cannot submit feedback.

---

## Part 2 — Issues Still Open or Newly Found ⚠️

---

### MEDIUM-01 — `pwa_installs` Has No Policies in the Unified File _(Fixed)_

**Resolution:** The `pwa_installs` table has been completely removed from the project. This issue is no longer applicable.

---

### MEDIUM-NEW-01 — Webhook `userId` Guard Is Conditional _(New — High Impact)_

**File:** `supabase/functions/payment-webhook/index.ts`

```typescript
// Current — VULNERABLE path:
async function activatePurchase(supabase, sessionId, paymentId, userId) {
  let query = supabase.from("purchases")
    .update({ status: "active", ... })
    .eq("payment_session_id", sessionId)
    .eq("status", "pending");

  if (userId) {                              // ← conditional guard
    query = query.eq("user_id", userId);     // ← SKIPPED if userId is falsy
  }
  ...
}
```

**Why this matters:** Paymob sends `user_id` in `order.shipping_data.extra_description` — this is a custom field that is not guaranteed to be present in every webhook event type (e.g., refund callbacks, dispute notifications, or failed payment events). If `userId` is `undefined`, the `.eq("user_id", userId)` line is skipped and the query matches **any** purchase with that `session_id`, regardless of owner.

An attacker who intercepts or replays a webhook with a known `session_id` but without a `user_id` field could activate purchases across arbitrary user accounts.

**Fix — make `userId` mandatory, reject if absent:**

```typescript
async function activatePurchase(supabase, sessionId, paymentId, userId) {
  // Hard reject — never activate without a known owner
  if (!userId) {
    console.error(
      `[Webhook] activatePurchase called without userId for session ${sessionId}`,
    );
    throw new Error("userId is required to activate a purchase");
  }

  const { error } = await supabase
    .from("purchases")
    .update({
      status: "active",
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq("payment_session_id", sessionId)
    .eq("user_id", userId) // ← always applied
    .eq("status", "pending");

  if (error) throw error;
}
```

Apply the same pattern to `revokePurchase`.

---

### MEDIUM-NEW-02 — `verify-purchase` Does Not Validate `module_id` Against DB _(New)_

**File:** `supabase/functions/verify-purchase/index.ts`

```typescript
// Current — missing validation:
if (session.payment_status === "paid") {
  await supabaseAdmin
    .from("purchases")
    .update({ status: "active", payment_id: session.payment_intent })
    .eq("payment_session_id", session_id)
    .eq("user_id", user.id);

  return { status: "active", module_id: session.metadata?.module_id }; // ← metadata not cross-checked
}
```

**Why this matters:** This fallback path (for when the webhook hasn't fired yet) trusts `session.metadata.module_id` from Stripe without checking that it matches the `module_id` stored in the `purchases` row. If Stripe metadata were corrupted or if the `purchases` row pointed to a different module (e.g., due to a race condition or a DB update in between), the wrong module could be activated.

**Fix — cross-check metadata against DB before activating:**

```typescript
if (session.payment_status === "paid") {
  // First: fetch the pending purchase to validate
  const { data: pendingPurchase } = await supabaseAdmin
    .from("purchases")
    .select("id, module_id, subject_id")
    .eq("payment_session_id", session_id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!pendingPurchase) {
    // Already activated by webhook, or session doesn't belong to this user
    return new Response(JSON.stringify({ status: "not_found" }), {
      status: 404,
    });
  }

  // Cross-check: Stripe metadata must match DB record
  const metaModuleId = session.metadata?.module_id;
  if (metaModuleId && metaModuleId !== pendingPurchase.module_id) {
    console.error(
      `[verify-purchase] module_id mismatch: stripe=${metaModuleId} db=${pendingPurchase.module_id}`,
    );
    return new Response(JSON.stringify({ error: "Session mismatch" }), {
      status: 403,
    });
  }

  await supabaseAdmin
    .from("purchases")
    .update({ status: "active", payment_id: session.payment_intent })
    .eq("id", pendingPurchase.id); // use PK, not session_id

  return new Response(
    JSON.stringify({
      status: "active",
      module_id: pendingPurchase.module_id, // return from DB, not from Stripe metadata
    }),
    { status: 200 },
  );
}
```

---

### MEDIUM-NEW-03 — CORS Falls Back to `"*"` When `APP_URL` Is Not Set _(New)_

**Files:** `create-checkout/index.ts`, `verify-purchase/index.ts`

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_URL") ?? "*",  // ← open fallback
  ...
};
```

**Why this matters:** If `APP_URL` is not configured in `supabase secrets set`, every origin on the internet can call your payment Edge Functions directly — including from attacker-controlled browser pages that send requests with a victim's JWT cookie.

**Fix — hard-fail on missing `APP_URL`:**

```typescript
const APP_URL = Deno.env.get("APP_URL");
if (!APP_URL) {
  // In Deno Deploy / Supabase Edge Functions, this runs at cold start.
  // A missing APP_URL is a misconfiguration — fail loudly.
  throw new Error("APP_URL environment variable is not set");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": APP_URL,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

Also set it in CI/CD verification:

```bash
supabase secrets list | grep APP_URL  # confirm it exists before deploying
```

---

### LOW-NEW-01 — HMAC Comparison Is Not Constant-Time _(New)_

**File:** `supabase/functions/payment-webhook/index.ts`

```typescript
// Current — vulnerable to timing attack:
return computed === receivedHmac;
```

**Why this matters:** JavaScript `===` string comparison short-circuits on the first differing byte. An attacker sending millions of crafted webhook requests with varying HMAC bytes could statistically infer the correct HMAC one byte at a time — a known timing side-channel. In practice, Supabase Edge Functions add network jitter that makes this very hard to exploit, but it is still a theoretical weakness and violates best practice.

**Fix — use `timingSafeEqual`:**

```typescript
import { timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts";

// In verifyPaymobHmac:
const computedBytes = new TextEncoder().encode(computed);
const receivedBytes = new TextEncoder().encode(receivedHmac);

if (computedBytes.length !== receivedBytes.length) return false;
return timingSafeEqual(computedBytes, receivedBytes);
```

---

### LOW-NEW-02 — `ENVIRONMENT` Check Is Case-Sensitive _(New)_

**Files:** `create-checkout/index.ts`, `payment-webhook/index.ts`

```typescript
const isDev = Deno.env.get("ENVIRONMENT") === "development";
```

**Why this matters:** If someone sets `ENVIRONMENT=Development` (capital D) or `ENVIRONMENT=dev`, `isDev` is `false` and the function behaves as production — this is actually the _safe_ failure mode. However, the reverse risk is that a developer sets `ENVIRONMENT=DEVELOPMENT` intending a dev environment but not getting it, then wonders why auto-activation isn't working, and manually activates purchases through some other means.

More importantly: if `ENVIRONMENT` is unset (common in a fresh deploy), `Deno.env.get("ENVIRONMENT")` returns `undefined`, so `isDev = false`. **This is safe** — unset means production behavior. But it should be documented.

**Fix — normalize and document:**

```typescript
const env = Deno.env.get("ENVIRONMENT")?.toLowerCase() ?? "production";
const isDev = env === "development" || env === "dev";

// Fail if an unexpected value is passed
const validEnvs = ["production", "staging", "development", "dev"];
if (!validEnvs.includes(env)) {
  throw new Error(
    `Unknown ENVIRONMENT value: "${env}". Must be one of: ${validEnvs.join(", ")}`,
  );
}
```

---

### LOW-NEW-03 — `pg_cron.job` Table Access Not Verified _(New)_

**File:** `supabase/migrations/20260401000000_harvi_master_baseline.sql`

```sql
SELECT cron.schedule('harvi-weekly-cleanup', '0 3 * * 0', $$
    BEGIN;
        DELETE FROM public.quiz_results WHERE created_at < NOW() - INTERVAL '1 year';
        DELETE FROM public.feedback WHERE created_at < NOW() - INTERVAL '1 year';
    COMMIT;
$$);
```

**Why this matters:** `pg_cron` runs jobs as the role that scheduled them (typically `postgres`). The `cron.job` table in Supabase is owned by the `supabase_admin` role, not accessible to `authenticated` or `anon`. This is safe by default. However, if anyone with `postgres` access is compromised, they could insert a malicious cron job with arbitrary SQL.

**Verify your current state:**

```sql
-- Who can write to pg_cron.job?
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'cron' AND table_name = 'job';
-- Expected: only postgres/supabase_admin have INSERT/UPDATE

-- What jobs are currently registered?
SELECT jobname, schedule, command, username FROM cron.job;
-- Expected: only 'harvi-weekly-cleanup' — no unexpected jobs
```

**Add this to your weekly monitoring queries.**

---

## Part 3 — SQL Verification Queries

Run these in Supabase SQL Editor before every deploy.

### 3.1 — All Tables Have RLS Enabled

```sql
SELECT tablename,
  CASE WHEN rowsecurity THEN '✅ ON' ELSE '🚨 OFF — DATA EXPOSED' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity ASC, tablename;
-- Expected: every row shows ✅ ON
```

### 3.2 — No Policy Uses Bare `auth.uid()` (O(N) Scan)

```sql
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR
    (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );
-- Expected: 0 rows
```

### 3.3 — `purchases` Has No Client-Writable Policies

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'purchases'
  AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
  AND 'authenticated' = ANY(roles);
-- Expected: 0 rows — authenticated users cannot write purchases
```

### 3.4 — No Table Has RLS ON But Zero Policies (Locked-Out Tables)

```sql
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

### 3.5 — `is_admin()` Cannot Be Spoofed

```sql
-- As a non-admin authenticated user:
SET LOCAL "request.jwt.claims" = '{"sub":"<non-admin-user-id>","role":"service_role"}';
SELECT public.is_admin();
-- Expected: false — JWT role claim has no effect
RESET ALL;
```

### 3.6 — `SECURITY DEFINER` Functions Are Owned by Superuser

```sql
SELECT p.proname, r.rolname AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN (
    'check_content_access','is_admin',
    'get_content_access_map','get_user_streak',
    'get_admin_dashboard_stats','get_analytics_summary'
  );
-- Expected: owner = 'postgres' or 'supabase_admin' for all rows
-- If owner = 'authenticated': CRITICAL — any user can drop or replace this function
```

### 3.7 — (Removed `pwa_installs` coverage check)

### 3.8 — No Unexpected Cron Jobs

```sql
SELECT jobname, schedule, command FROM cron.job;
-- Expected: only 'harvi-weekly-cleanup'
-- Any unexpected jobs = potential backdoor
```

---

## Part 4 — Pre-Deploy Checklist

### Database

```
[ ] All 3 critical issues confirmed fixed (CRIT-01, 02, 03)
[ ] Query 3.1 passes — all tables have RLS ON
[ ] Query 3.2 passes — 0 bare auth.uid() in policies
[ ] Query 3.3 passes — purchases has no client-writable policies
[ ] Query 3.4 passes — no tables locked out (0 rows)
[ ] Query 3.7 skipped — pwa_installs removed
[ ] Query 3.8 checked — no unexpected cron jobs
```

### Edge Functions

```
[ ] create-checkout: status='pending' on insert (never 'active')
[ ] create-checkout: APP_URL env var set — CORS not falling back to '*'
[ ] payment-webhook: HMAC runs before DB ops
[ ] payment-webhook: userId is validated as non-null before activatePurchase()
[ ] payment-webhook: HMAC uses timingSafeEqual (LOW-NEW-01)
[ ] verify-purchase: module_id cross-checked against DB before activation
[ ] verify-purchase: APP_URL env var set
[ ] All functions: ENVIRONMENT var set to 'production' in Supabase secrets
[ ] supabase secrets list confirms: APP_URL, PAYMOB_HMAC_SECRET, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY all present
```

### Deployment Sequence

```
1. Apply migrations in order — run Query 3.4 immediately after to check for locked-out tables
2. Run all queries in Part 3
3. supabase functions deploy create-checkout payment-webhook verify-purchase
4. supabase secrets set APP_URL=https://yourapp.com ENVIRONMENT=production ...
5. Trigger a test webhook event — confirm HMAC verification accepts and rejects correctly
6. Run a test purchase as a non-admin user — confirm status starts as 'pending'
7. Monitor Supabase Edge Function logs for 15 minutes — watch for 401/403/500 spikes
```

---

## Part 5 — Ongoing Monitoring (Run Weekly)

```sql
-- Pending purchases older than 24h (webhook may have failed)
SELECT p.id, u.email, p.payment_session_id, p.created_at, NOW() - p.created_at AS age
FROM public.purchases p
JOIN auth.users u ON u.id = p.user_id
WHERE p.status = 'pending'
  AND p.created_at < NOW() - INTERVAL '24 hours'
ORDER BY p.created_at;

-- Duplicate session IDs (should never happen)
SELECT payment_session_id, COUNT(*) AS count
FROM public.purchases
GROUP BY payment_session_id
HAVING COUNT(*) > 1;

-- Revenue by module
SELECT m.name, COUNT(*) AS paying_students, SUM(p.amount_cents) / 100.0 AS revenue_usd
FROM public.purchases p
JOIN public.modules m ON m.id = p.module_id
WHERE p.status = 'active'
GROUP BY m.name ORDER BY revenue_usd DESC;

-- Unexpected cron jobs
SELECT jobname, schedule, command FROM cron.job;
-- Expected: only 'harvi-weekly-cleanup'
```

---

## Severity Key

| Label       | Fix Before                  |
| ----------- | --------------------------- |
| 🔴 Critical | Any users are in the system |
| 🟠 High     | Going live                  |
| 🟡 Medium   | 100+ users                  |
| ⚪ Low      | 1,000+ users / scale        |
