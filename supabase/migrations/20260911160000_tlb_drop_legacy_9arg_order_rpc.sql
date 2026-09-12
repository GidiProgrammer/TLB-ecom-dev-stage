-- =========================================================
-- TLB Enterprise — Drop obsolete 9-arg create_order_with_items
--
-- Live inspection (project mothgrmclaowhsiemiuj):
--   identity:
--     _user_id uuid, _reference text, _shipping_name text,
--     _shipping_email text, _shipping_phone text,
--     _shipping_address text, _shipping_city text,
--     _institution text, _items jsonb
--
-- Application checkout (src/lib/orders.ts) calls only the 8-arg p_*
-- overload. No remaining callers of the 9-arg overload.
--
-- DROP uses the full signature so the 8-arg function is untouched.
-- =========================================================

DROP FUNCTION IF EXISTS public.create_order_with_items(
  _user_id uuid,
  _reference text,
  _shipping_name text,
  _shipping_email text,
  _shipping_phone text,
  _shipping_address text,
  _shipping_city text,
  _institution text,
  _items jsonb
);
