-- =========================================================
-- TLB Enterprise — Atomic order creation
-- Run AFTER 001_tlb_core_schema.sql and 002_tlb_seed_data.sql
-- =========================================================

-- Creates an order + its order_items + decrements stock for every line,
-- all inside one transaction. If ANY item has insufficient stock, the
-- whole order is rolled back — nothing is partially created.
--
-- SECURITY: callable only by service_role. The client never calls this
-- directly — it goes through a server-side route using supabaseAdmin.
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  _user_id UUID,
  _reference TEXT,
  _shipping_name TEXT,
  _shipping_email TEXT,
  _shipping_phone TEXT,
  _shipping_address TEXT,
  _shipping_city TEXT,
  _institution TEXT,
  _items JSONB  -- [{ "product_id": "uuid", "quantity": 2 }, ...]
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order_id UUID;
  _item JSONB;
  _product RECORD;
  _line_total NUMERIC(12,2);
  _running_subtotal NUMERIC(12,2) := 0;
BEGIN
  IF jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create an order with no items';
  END IF;

  -- Create the order shell first (total/subtotal filled in after the loop).
  INSERT INTO public.orders (
    user_id, reference, status, shipping_name, shipping_email,
    shipping_phone, shipping_address, shipping_city, institution
  ) VALUES (
    _user_id, _reference, 'pending', _shipping_name, _shipping_email,
    _shipping_phone, _shipping_address, _shipping_city, _institution
  ) RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    -- Lock the product row so concurrent checkouts can't both oversell it.
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

    -- Reuses the decrement_stock function from 001_tlb_core_schema.sql
    -- (also logs to stock_movements with reason='sale').
    PERFORM public.decrement_stock(_product.id, (_item ->> 'quantity')::INTEGER, _order_id);
  END LOOP;

  UPDATE public.orders
  SET subtotal = _running_subtotal, total = _running_subtotal
  WHERE id = _order_id;

  RETURN _order_id;
END; $$;

-- Only the server (service role) may call this — never the browser.
REVOKE EXECUTE ON FUNCTION public.create_order_with_items(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
