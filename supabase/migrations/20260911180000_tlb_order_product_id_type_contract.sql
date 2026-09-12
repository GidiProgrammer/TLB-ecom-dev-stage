-- =========================================================
-- TLB Enterprise — Fix checkout TEXT / UUID product-id contract
--
-- Live facts (2026-09-11, project mothgrmclaowhsiemiuj):
--   products.id              TEXT   (all 37 rows UUID-shaped)
--   order_items.product_id   UUID
--   stock_movements.product_id TEXT
--   decrement_stock(_product_id uuid, ...) compared products.id = uuid
--     → operator does not exist: text = uuid
--
-- create_order_with_items already looks up products by text, then
-- casts to uuid for order_items and decrement_stock. Failure is inside
-- decrement_stock, after the order row insert, so the transaction
-- rolls back.
--
-- Does not change products.id, order_items, stock_movements, or
-- warehouse/ops tables. Does not weaken RPC grants.
-- =========================================================

CREATE OR REPLACE FUNCTION public.decrement_stock(
  _product_id TEXT,
  _qty INTEGER,
  _order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  IF _product_id IS NULL OR btrim(_product_id) = '' THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF _qty IS NULL OR _qty <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  -- products.id is text. Compare as text; do not coerce the column to uuid.
  SELECT stock_quantity INTO current_stock
  FROM public.products
  WHERE id = _product_id
  FOR UPDATE;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product % not found', _product_id;
  END IF;

  IF current_stock < _qty THEN
    RAISE EXCEPTION 'Insufficient stock for product %: have %, need %',
      _product_id, current_stock, _qty;
  END IF;

  UPDATE public.products
  SET stock_quantity = stock_quantity - _qty
  WHERE id = _product_id;

  -- stock_movements.product_id is text on the live database.
  INSERT INTO public.stock_movements (product_id, change_qty, reason, reference_id)
  VALUES (_product_id, -_qty, 'sale', _order_id);
END;
$$;

-- Remove the UUID overload that compared products.id (text) to uuid.
DROP FUNCTION IF EXISTS public.decrement_stock(uuid, integer, uuid);

REVOKE EXECUTE ON FUNCTION public.decrement_stock(text, integer, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.decrement_stock(text, integer, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_user_id UUID,
  p_institution TEXT,
  p_shipping_name TEXT,
  p_shipping_email TEXT,
  p_shipping_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id UUID;
  _reference TEXT;
  _item JSONB;
  _product RECORD;
  _qty INTEGER;
  _line_total NUMERIC(12,2);
  _running_subtotal NUMERIC(12,2) := 0;
  _product_id TEXT;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create an order with no items';
  END IF;

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
    BEGIN
      _qty := (_item ->> 'quantity')::INTEGER;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid quantity';
    END;

    IF _qty IS NULL OR _qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    _product_id := btrim(_item ->> 'product_id');

    IF _product_id IS NULL OR _product_id = '' THEN
      RAISE EXCEPTION 'Product not found';
    END IF;

    -- order_items.product_id is uuid. Every live products.id is UUID-shaped;
    -- reject anything that cannot be stored there before casting.
    IF _product_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Product % not found', _product_id;
    END IF;

    SELECT id, name, price, stock_quantity, is_active, deleted_at
    INTO _product
    FROM public.products
    WHERE id = _product_id
    FOR UPDATE;

    IF _product.id IS NULL THEN
      RAISE EXCEPTION 'Product % not found', _product_id;
    END IF;

    IF _product.is_active IS NOT TRUE OR _product.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Product is not available';
    END IF;

    IF _product.stock_quantity < _qty THEN
      RAISE EXCEPTION 'Insufficient stock for %: have %, need %',
        _product.name, _product.stock_quantity, _qty;
    END IF;

    _line_total := _product.price * _qty;
    _running_subtotal := _running_subtotal + _line_total;

    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    VALUES (_order_id, _product.id::uuid, _product.name, _product.price, _qty, _line_total);

    PERFORM public.decrement_stock(_product.id, _qty, _order_id);
  END LOOP;

  UPDATE public.orders
  SET subtotal = _running_subtotal, total = _running_subtotal
  WHERE id = _order_id;

  RETURN _order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, jsonb
) TO service_role;

-- Same products.id TEXT comparison bug if restock is ever used.
CREATE OR REPLACE FUNCTION public.restock_product(
  _product_id UUID,
  _qty INTEGER,
  _note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity + _qty
  WHERE id = _product_id::text;

  INSERT INTO public.stock_movements (product_id, change_qty, reason, note, created_by)
  VALUES (_product_id::text, _qty, 'restock', _note, auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restock_product(uuid, integer, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.restock_product(uuid, integer, text)
  TO service_role;
