# Reference: RLS Testing

Run these in Supabase SQL Editor to verify your RLS policies work correctly
before deploying. Test every scenario — RLS bugs are silent (they return
empty results, not errors).

---

## Setup Test Identities

```sql
-- Create test users via Supabase Auth (do in Auth dashboard or API)
-- Then get their UUIDs:
SELECT id, email FROM auth.users WHERE email IN (
    'anon_user@test.com',
    'free_user@test.com',
    'paid_user@test.com',
    'admin_user@test.com'
);

-- Set variables for testing (replace with real UUIDs)
\set anon_uid    '00000000-0000-0000-0000-000000000000'
\set free_uid    '<free-user-uuid>'
\set paid_uid    '<paid-user-uuid>'
\set admin_uid   '<admin-user-uuid>'
\set test_module '<a-paid-module-uuid>'
\set test_lecture '<a-lecture-in-that-module-uuid>'
```

---

## Test Suite

### Test 1 — Unauthenticated user sees NO questions

```sql
-- Simulate anon role (no JWT)
SET ROLE anon;
SELECT COUNT(*) FROM public.questions;
-- Expected: 0

RESET ROLE;
```

### Test 2 — Authenticated user with no purchases sees only free content

```sql
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = jsonb_build_object(
    'sub', :'free_uid',
    'role', 'authenticated'
)::text;

-- Should see 0 questions from paid module
SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
JOIN public.subjects s ON s.id = l.subject_id
WHERE s.module_id = :'test_module'::uuid;
-- Expected: 0

RESET ROLE;
```

### Test 3 — Paid user sees questions from their purchased module

```sql
-- First insert an active purchase for paid_uid
INSERT INTO public.purchases (user_id, module_id, stripe_session_id, amount_cents, status)
VALUES (:'paid_uid'::uuid, :'test_module'::uuid, 'cs_test_123', 999, 'active');

-- Now simulate paid user
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = jsonb_build_object(
    'sub', :'paid_uid',
    'role', 'authenticated'
)::text;

SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
JOIN public.subjects s ON s.id = l.subject_id
WHERE s.module_id = :'test_module'::uuid;
-- Expected: > 0 (all questions in that module)

RESET ROLE;
```

### Test 4 — Refunded purchase loses access immediately

```sql
UPDATE public.purchases SET status = 'refunded'
WHERE user_id = :'paid_uid'::uuid AND module_id = :'test_module'::uuid;

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = jsonb_build_object(
    'sub', :'paid_uid',
    'role', 'authenticated'
)::text;

SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
JOIN public.subjects s ON s.id = l.subject_id
WHERE s.module_id = :'test_module'::uuid;
-- Expected: 0

RESET ROLE;

-- Restore for next tests
UPDATE public.purchases SET status = 'active'
WHERE user_id = :'paid_uid'::uuid AND module_id = :'test_module'::uuid;
```

### Test 5 — Free module bypasses purchase check

```sql
INSERT INTO public.free_modules (module_id, notes)
VALUES (:'test_module'::uuid, 'Test free module');

-- Unauthenticated user
SET ROLE anon;
SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
JOIN public.subjects s ON s.id = l.subject_id
WHERE s.module_id = :'test_module'::uuid;
-- Expected: > 0 (free modules are visible to all)

RESET ROLE;

-- Clean up
DELETE FROM public.free_modules WHERE module_id = :'test_module'::uuid;
```

### Test 6 — Free subject within a paid module

```sql
-- Get a subject from the paid module
\set test_subject (SELECT id FROM public.subjects WHERE module_id = :'test_module'::uuid LIMIT 1)

INSERT INTO public.free_subjects (subject_id, notes)
VALUES (:'test_subject'::uuid, 'Preview subject');

-- Free user (no purchases) can see questions from this subject only
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = jsonb_build_object(
    'sub', :'free_uid',
    'role', 'authenticated'
)::text;

-- Questions from the free subject
SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
WHERE l.subject_id = :'test_subject'::uuid;
-- Expected: > 0

-- Questions from OTHER subjects in same module (not free)
SELECT COUNT(*) FROM public.questions q
JOIN public.lectures l ON l.id = q.lecture_id
JOIN public.subjects s ON s.id = l.subject_id
WHERE s.module_id = :'test_module'::uuid
  AND l.subject_id != :'test_subject'::uuid;
-- Expected: 0

RESET ROLE;

-- Clean up
DELETE FROM public.free_subjects WHERE subject_id = :'test_subject'::uuid;
```

### Test 7 — Client cannot insert into purchases

```sql
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = jsonb_build_object(
    'sub', :'free_uid',
    'role', 'authenticated'
)::text;

INSERT INTO public.purchases (user_id, module_id, stripe_session_id, amount_cents, status)
VALUES (:'free_uid'::uuid, :'test_module'::uuid, 'cs_fake_999', 0, 'active');
-- Expected: ERROR — no INSERT policy for authenticated role

RESET ROLE;
```

### Test 8 — Client cannot modify another user's purchase

```sql
-- paid_uid cannot see or modify free_uid's data
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = jsonb_build_object(
    'sub', :'paid_uid',
    'role', 'authenticated'
)::text;

SELECT * FROM public.purchases WHERE user_id = :'free_uid'::uuid;
-- Expected: 0 rows

RESET ROLE;
```

### Test 9 — check_content_access function integrity

```sql
-- Direct function test as anon (no auth context)
SELECT public.check_content_access(:'test_lecture'::uuid);
-- Expected: false (no free designation, no user)

-- As paid user
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = jsonb_build_object(
    'sub', :'paid_uid',
    'role', 'authenticated'
)::text;

SELECT public.check_content_access(:'test_lecture'::uuid);
-- Expected: true (has active purchase)

RESET ROLE;
```

### Test 10 — get_module_access_map returns correct flags

```sql
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = jsonb_build_object(
    'sub', :'paid_uid',
    'role', 'authenticated'
)::text;

SELECT * FROM public.get_module_access_map();
-- Expected: test_module has has_access=true, is_free=false

RESET ROLE;
```

---

## RLS Coverage Audit

Run this to verify every table has RLS enabled:

```sql
SELECT
    schemaname,
    tablename,
    rowsecurity,
    CASE WHEN rowsecurity THEN '✅ RLS ON' ELSE '🚨 RLS OFF' END AS status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: rowsecurity = true for ALL rows
```

Run this to see all active policies:

```sql
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,        -- SELECT, INSERT, UPDATE, DELETE, ALL
    roles,
    qual        -- USING clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Check for missing indexes on RLS policy columns:

```sql
-- Columns used in RLS that should always be indexed
SELECT
    t.tablename,
    c.column_name,
    CASE WHEN i.indexname IS NOT NULL THEN '✅ indexed' ELSE '🚨 MISSING INDEX' END AS index_status
FROM (
    VALUES
        ('purchases', 'user_id'),
        ('purchases', 'module_id'),
        ('purchases', 'status'),
        ('free_modules', 'module_id'),
        ('free_subjects', 'subject_id'),
        ('lectures', 'subject_id'),
        ('subjects', 'module_id')
) AS c(tablename, column_name)
JOIN pg_tables t ON t.tablename = c.tablename AND t.schemaname = 'public'
LEFT JOIN pg_indexes i
    ON i.tablename = c.tablename
    AND i.schemaname = 'public'
    AND i.indexdef LIKE '%' || c.column_name || '%';
```
