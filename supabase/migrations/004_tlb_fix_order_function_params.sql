-- =========================================================
-- TLB Enterprise — create_order_with_items (self-contained)
-- Standalone: does not depend on 003 having been run first.
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_user_id UUID,
  p_institution TEXT,
  p_shipping_name TEXT,
  p_shipping_email TEXT,
  p_shipping_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_items JSONB  -- [{ "product_id": "uuid", "quantity": 2 }, ...]
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order_id UUID;
  _reference TEXT;
  _item JSONB;
  _product RECORD;
  _line_total NUMERIC(12,2);
  _running_subtotal NUMERIC(12,2) := 0;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create an order with no items';
  END IF;

  -- Generate a human-readable, unique-enough reference here — single
  -- source of truth, so the client never needs to invent one.
  -- Uses only core Postgres functions (no pgcrypto dependency, which
  -- avoids search_path/schema issues on Supabase).
  -- Format: TLB-20260909-4F2A9C  (date + 6 random hex-ish chars)
  _reference := 'TLB-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  INSERT INTO public.orders (
    user_id, reference, status, shipping_name, shipping_email,
    shipping_phone, shipping_address, shipping_city, institution
  ) VALUES (
    p_user_id, _reference, 'pending', p_shipping_name, p_shipping_email,
    p_shipping_phone, p_shipping_address, p_shipping_city, p_institution
  ) RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, price, stock_quantity INTO _product
    FROM public.products
    WHERE id = (_item ->> 'product_id')::UUID
    FOR UPDATE;

    IF _product.id IS NULL THEN
      RAISE EXCEPTION 'Product % not found', _item ->> 'product_id';
    END IF;

    IF _product.stock_quantity < (_item ->> 'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for %: have %, need %',
        _product.name, _product.stock_quantity, (_item ->> 'quantity')::INTEGER;
    END IF;

    _line_total := _product.price * (_item ->> 'quantity')::INTEGER;
    _running_subtotal := _running_subtotal + _line_total;

    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    VALUES (_order_id, _product.id, _product.name, _product.price, (_item ->> 'quantity')::INTEGER, _line_total);

    PERFORM public.decrement_stock(_product.id, (_item ->> 'quantity')::INTEGER, _order_id);
  END LOOP;

  UPDATE public.orders
  SET subtotal = _running_subtotal, total = _running_subtotal
  WHERE id = _order_id;

  RETURN _order_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.create_order_with_items(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
