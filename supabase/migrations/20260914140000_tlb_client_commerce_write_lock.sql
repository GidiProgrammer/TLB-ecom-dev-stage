-- =========================================================
-- TLB Enterprise — Client commerce write lock (forward-only)
--
-- CP34 Phase 2: leftover Lovable "own orders" / "own quotes" FOR ALL
-- policies are never dropped by later hardening. Combined with any
-- remaining INSERT/UPDATE/DELETE grants, a JWT could mutate commerce
-- rows. This migration states the intended end state explicitly.
--
-- Does not rewrite 001–004 or earlier timestamped files.
-- Does not use FORCE ROW LEVEL SECURITY.
-- =========================================================

-- -----------------------------------------------------------------
-- Orders: customers SELECT own rows only
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "own orders" ON public.orders;
DROP POLICY IF EXISTS "own orders insert" ON public.orders;
DROP POLICY IF EXISTS "admin update orders" ON public.orders;

REVOKE ALL ON TABLE public.orders FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

-- -----------------------------------------------------------------
-- Order items: SELECT own (via existing policies); no client writes
-- -----------------------------------------------------------------
REVOKE ALL ON TABLE public.order_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;

-- -----------------------------------------------------------------
-- Quotes: customers SELECT own rows only
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "own quotes" ON public.quotes;
DROP POLICY IF EXISTS "own quotes insert" ON public.quotes;
DROP POLICY IF EXISTS "admin manage quotes" ON public.quotes;

REVOKE ALL ON TABLE public.quotes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.quotes TO authenticated;
GRANT ALL ON TABLE public.quotes TO service_role;

-- -----------------------------------------------------------------
-- Quote items: SELECT own; no client writes
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "admin manage quote items" ON public.quote_items;

REVOKE ALL ON TABLE public.quote_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.quote_items TO authenticated;
GRANT ALL ON TABLE public.quote_items TO service_role;

-- -----------------------------------------------------------------
-- Privileged RPCs: clients must not EXECUTE
-- -----------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_quote_with_items(
  uuid, text, text, text, text, text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_order_and_restore_stock(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.staff_restock_product(text, integer, text, uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.accept_quote(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_transactional_email_outbox(integer, interval, integer)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.restock_product(uuid, integer, text)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.decrement_stock(text, integer, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, jsonb, uuid
) TO service_role;

GRANT EXECUTE ON FUNCTION public.create_quote_with_items(
  uuid, text, text, text, text, text, jsonb, uuid
) TO service_role;

GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_stock(uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.staff_restock_product(text, integer, text, uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.accept_quote(uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_transactional_email_outbox(integer, interval, integer)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.restock_product(uuid, integer, text)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.decrement_stock(text, integer, uuid)
  TO service_role;

-- -----------------------------------------------------------------
-- Quoted prices: lock after accepted / declined (service_role included)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_terminal_quote_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _status public.quote_status;
BEGIN
  IF NEW.quoted_price IS NOT DISTINCT FROM OLD.quoted_price THEN
    RETURN NEW;
  END IF;

  SELECT status
  INTO _status
  FROM public.quotes
  WHERE id = NEW.quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  IF _status IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Quoted prices cannot be changed after this quotation is closed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_terminal_quote_price_change ON public.quote_items;
CREATE TRIGGER prevent_terminal_quote_price_change
  BEFORE UPDATE OF quoted_price ON public.quote_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_terminal_quote_price_change();
