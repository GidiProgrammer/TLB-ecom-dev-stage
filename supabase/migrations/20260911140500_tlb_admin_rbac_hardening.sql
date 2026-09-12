-- =========================================================
-- TLB Enterprise — Admin/staff RBAC hardening (forward-only)
--
-- Live inspection (project mothgrmclaowhsiemiuj):
--   * user_roles has RLS enabled and no client policies (good),
--     but default GRANTs still give anon/authenticated INSERT/UPDATE/
--     DELETE/TRUNCATE. TRUNCATE is not protected by RLS.
--   * quotes / quote_items still have staff FOR ALL policies even
--     though the e-com admin UI is read-only and customers already
--     lost INSERT grants. Narrow those policies to SELECT.
--
-- Does not touch warehouse/internal tables.
-- Does not recreate order UPDATE (removed in 20260910010000).
-- =========================================================

REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "admin manage quotes" ON public.quotes;
CREATE POLICY "admin read all quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "admin manage quote items" ON public.quote_items;
CREATE POLICY "admin read all quote items" ON public.quote_items
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
