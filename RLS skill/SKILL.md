---
name: harvi-rls-monetization
description: >
  Senior-level Supabase RLS policies and Edge Functions for Harvi's clientless
  "pay-per-module" architecture. Use this skill whenever the user wants to:
  add paid access gates to modules/subjects/questions, write RLS policies for
  Supabase, create Stripe or payment-webhook Edge Functions, implement free-tier
  content for growth hacking, audit existing RLS for security holes, or design
  any business-logic layer that lives entirely in Supabase (no backend server).
  Also triggers for: "how do I secure my questions", "make this module paid",
  "free tier content", "access control supabase", "monetize my app supabase",
  "edge function payments", or any request touching entitlements, subscriptions,
  or content gating in this codebase.
---

# Harvi RLS & Monetization Skill

## Architecture Contract

Harvi is a **pure client → Supabase** app. There is **no application server**.
All security, business logic, and entitlement enforcement MUST live in:

1. **Row Level Security (RLS)** policies on Postgres tables
2. **Supabase Edge Functions** (Deno/TypeScript) for webhook processing and payment orchestration

The client (React Native / Expo) talks directly to Supabase via the `@supabase/supabase-js` SDK using the **anon key**. The anon key is public and must be treated as untrusted. RLS is the only trust boundary.

---

## Data Model — Entitlements Layer

Before writing any RLS, add these tables (read references/schema.md for full DDL):

```
purchases           — one row per user per module purchase
module_access       — view: joins purchases + free_modules for fast RLS lookups
free_modules        — admin-controlled list of permanently-free modules
free_subjects       — admin-controlled list of permanently-free subjects
```

Key design decisions:
- `purchases` is append-only (never UPDATE/DELETE from client)
- `module_access` is a Postgres **security-definer view** — the client never touches `purchases` directly
- A `status` column on `purchases` ('active' | 'refunded' | 'pending') gates access
- Free content is checked via a separate table, not a column on `modules` (admins can toggle without a migration)

---

## RLS Golden Rules for This Architecture

1. **Every table has RLS enabled.** No exceptions. Even lookup tables.
2. **Always use `(SELECT auth.uid())` not `auth.uid()`** — the function-call form is evaluated once per query; the expression form is re-evaluated per row, costing O(N) instead of O(1).
3. **Never trust client-supplied data for entitlement checks.** Use `EXISTS` subqueries against server-controlled tables.
4. **Policies are additive (OR logic).** Keep free-content policy and paid-content policy separate so they compose cleanly.
5. **Use `SECURITY DEFINER` functions for complex checks** — this runs as the DB owner, bypassing RLS on internal tables, which is intentional for entitlement resolution.
6. **Index every column used in a WHERE clause inside an RLS policy.** Unindexed RLS = full table scan on every row access.
7. **Separate read vs. write policies.** `FOR SELECT` and `FOR INSERT` are different policies. Never combine them.
8. **Test with `SET ROLE authenticated; SET request.jwt.claims...`** before deploying. See references/testing.md.

---

## Content Access Decision Tree

```
User requests questions for lecture L
        │
        ▼
Is the lecture's subject in free_subjects?  ──YES──▶ ALLOW
        │ NO
        ▼
Is the lecture's module in free_modules?   ──YES──▶ ALLOW
        │ NO
        ▼
Does user have an active purchase          ──YES──▶ ALLOW
for the lecture's module?
        │ NO
        ▼
        DENY (return 0 rows, not an error)
```

This tree is implemented as a single `SECURITY DEFINER` function `check_content_access(lecture_id UUID)` so the same logic is reused across all tables without duplication.

---

## Migration Order

Apply in this exact sequence — each migration depends on the previous:

| # | File | Purpose |
|---|------|---------|
| 1 | `20260501000000_entitlements_schema.sql` | New tables: purchases, free_modules, free_subjects |
| 2 | `20260501000001_access_function.sql` | `check_content_access()` SECURITY DEFINER function |
| 3 | `20260501000002_rls_content_tables.sql` | RLS on years/modules/subjects/lectures/questions |
| 4 | `20260501000003_rls_purchases.sql` | RLS on purchases (client can only read own rows) |
| 5 | `20260501000004_indexes.sql` | All indexes required by RLS policies |
| 6 | `20260501000005_admin_helpers.sql` | Admin RPCs: grant_free_module, revoke_access, etc. |

Read `references/migrations.md` for the full SQL of each file.

---

## Edge Functions

Three Edge Functions handle the payment lifecycle:

| Function | Trigger | Responsibility |
|----------|---------|---------------|
| `stripe-webhook` | POST from Stripe | Verify signature → insert into `purchases` |
| `create-checkout` | Called by client | Create Stripe Checkout Session, return URL |
| `verify-purchase` | Called by client after redirect | Confirm session paid, idempotent upsert |

Key security rules for Edge Functions:
- `stripe-webhook` validates `stripe-signature` header with `Stripe.webhooks.constructEvent`. Reject anything that fails signature check — do not log the body on failure.
- `create-checkout` uses the **service role key** (server-side only, set as Supabase secret). Never expose it to the client.
- All Edge Functions set `Access-Control-Allow-Origin` to your app's URL, not `*`.
- `verify-purchase` is idempotent — calling it twice for the same session is safe.

Read `references/edge-functions.md` for full Deno TypeScript source.

---

## Free Tier Growth Strategy

Two mechanisms, both admin-controlled with no client trust:

**1. Free Modules** — entire module unlocked for everyone
```sql
INSERT INTO free_modules (module_id) VALUES ('<uuid>');
-- Takes effect immediately, no app restart needed
```

**2. Free Subjects** — individual subject unlocked within a paid module
```sql
INSERT INTO free_subjects (subject_id) VALUES ('<uuid>');
```

Recommended growth hacking pattern:
- Keep Year 1, Module 1 entirely free (first-mover hook)
- Keep the first subject of every paid module free (preview taste)
- Use `free_subjects` to run time-limited promotions without a migration

The admin dashboard should expose toggles for both — see `references/admin-rpcs.md`.

---

## Client-Side Integration

The client needs zero changes to its query pattern. RLS makes restricted rows invisible — the client just sees empty results for locked content.

For UI gating (showing a lock icon), the client calls:
```typescript
const { data } = await supabase.rpc('get_module_access_map', { p_user_id: user.id });
// Returns: [{ module_id, has_access, is_free }]
```

For purchase flow:
```typescript
// 1. Client calls Edge Function
const { data } = await supabase.functions.invoke('create-checkout', {
  body: { module_id, success_url, cancel_url }
});
// 2. Redirect to data.url (Stripe Checkout)
// 3. On return, call verify-purchase
await supabase.functions.invoke('verify-purchase', {
  body: { session_id: searchParams.get('session_id') }
});
// 4. Invalidate React Query cache
queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
queryClient.invalidateQueries({ queryKey: ['module_access'] });
```

---

## Security Audit Checklist

Run through this before every deploy:

- [ ] `SELECT * FROM pg_tables WHERE schemaname='public' AND rowsecurity = false` returns 0 rows
- [ ] No policy uses `auth.uid()` without the `(SELECT ...)` wrapper
- [ ] `purchases` has no UPDATE or DELETE policy for `authenticated` role
- [ ] `free_modules` and `free_subjects` have no INSERT/UPDATE/DELETE for `authenticated` role (admin only via service role)
- [ ] Edge Functions reject requests with missing or invalid JWT
- [ ] Stripe webhook rejects any request where signature verification throws
- [ ] `check_content_access` function owner is `postgres` (SECURITY DEFINER runs as owner)
- [ ] All RLS policy supporting columns are indexed (see references/indexes.md)
- [ ] Test with an unauthenticated client — no questions rows returned
- [ ] Test with authenticated user with no purchases — only free content returned
- [ ] Test with authenticated user with active purchase — full module returned
- [ ] Test with authenticated user with refunded purchase — access denied

---

## Reference Files

Read these when implementing specific pieces:

- `references/migrations.md` — Full SQL for all 6 migration files
- `references/edge-functions.md` — Full Deno TypeScript for all 3 Edge Functions
- `references/testing.md` — SQL test harness to verify RLS behavior
- `references/admin-rpcs.md` — Admin helper functions and dashboard RPCs
- `references/client-hooks.md` — React Native hooks for purchase flow and access map
