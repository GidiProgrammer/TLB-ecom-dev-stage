-- =========================================================
-- TLB Enterprise — Security hardening (forward-only)
--
-- Why this exists:
-- Live inspection of project mothgrmclaowhsiemiuj (2026-09-10) found
-- production-blocking privilege drift after 001–004 were applied:
--
--   1. create_order_with_items (8-arg / p_* signature) is SECURITY DEFINER
--      but still executable by PUBLIC, anon, and authenticated.
--      Migration 004 revoked the obsolete 9-arg signature only.
--      A browser caller can create orders for any user_id, with any
--      product IDs, and the function writes totals from catalog prices.
--
--   2. restock_product is SECURITY DEFINER and granted to authenticated.
--      Any logged-in customer can increase product stock.
--
--   3. orders has RLS policy "own orders insert" plus INSERT grant.
--      Customers can insert arbitrary reference / subtotal / total /
--      shipping / pending status without going through the RPC.
--
--   4. orders has RLS policy "admin update orders" allowing staff/admin
--      clients to UPDATE every column, including status, subtotal, total.
--      Current admin UI is read-only; mutations belong on the service-role
--      server path.
--
-- This migration does not DROP the unused 9-arg create_order_with_items
-- overload. The live app (src/lib/orders.ts) calls the 8-arg p_* version
-- via supabaseAdmin. Execution on the 9-arg version is revoked here so
-- it cannot be invoked by clients; removal can happen in a later cleanup.
--
-- Does not rewrite 001–004 or Lovable timestamped migrations.
-- =========================================================

-- -----------------------------------------------------------------
-- A. Lock down create_order_with_items (both live overloads)
-- -----------------------------------------------------------------
-- 8-argument version used by the current server checkout path.
REVOKE EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, jsonb
) FROM PUBLIC, anon, authenticated;

-- Obsolete 9-argument version (still present on the live database).
REVOKE EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, text, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, jsonb
) TO service_role;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, text, jsonb
) TO service_role;

-- -----------------------------------------------------------------
-- B. Lock down restock_product
-- Trusted restock must go through supabaseAdmin / service_role.
-- Do not GRANT EXECUTE back to authenticated.
-- -----------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.restock_product(
  uuid, integer, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.restock_product(
  uuid, integer, text
) TO service_role;

-- Decrement is already revoked from clients on live; keep it that way.
REVOKE EXECUTE ON FUNCTION public.decrement_stock(
  uuid, integer, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.decrement_stock(
  uuid, integer, uuid
) TO service_role;

-- -----------------------------------------------------------------
-- C. Lock down direct customer order creation
-- Customers keep SELECT of their own orders.
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "own orders insert" ON public.orders;

REVOKE ALL ON public.orders FROM anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;

-- -----------------------------------------------------------------
-- D. Remove broad client UPDATE of orders (status / totals / all columns)
-- Staff/admin retain SELECT via existing read policies.
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "admin update orders" ON public.orders;
