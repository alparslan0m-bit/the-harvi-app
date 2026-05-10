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
