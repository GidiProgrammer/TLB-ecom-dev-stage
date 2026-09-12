-- =========================================================
-- TLB Enterprise — Catalogue JWT write lock + public SELECT
--
-- Live intent:
--   * anon/authenticated must not INSERT/UPDATE/DELETE/TRUNCATE
--     products or categories (browser JWT must not be a CMS path).
--   * "admin write products" / "admin write categories" FOR ALL
--     policies would become a mutation path if table GRANTs exist.
--   * Public product SELECT currently only checks is_active, so a
--     soft-deleted row with is_active still true could leak.
--
-- Does not change warehouse tables, orders, quotes, profiles,
-- user_roles, products.id type, or stock RPCs.
-- =========================================================

REVOKE ALL ON public.products FROM anon, authenticated;
REVOKE ALL ON public.categories FROM anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.categories TO service_role;

DROP POLICY IF EXISTS "admin write products" ON public.products;
DROP POLICY IF EXISTS "admin write categories" ON public.categories;

DROP POLICY IF EXISTS "public read active products" ON public.products;
CREATE POLICY "public read active products" ON public.products
  FOR SELECT TO authenticated, anon
  USING (is_active = true AND deleted_at IS NULL);

-- Staff/admin may still SELECT inactive and soft-deleted products via JWT
-- (reads only). Mutations go through service-role server functions.
DROP POLICY IF EXISTS "admin read all products" ON public.products;
CREATE POLICY "admin read all products" ON public.products
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
