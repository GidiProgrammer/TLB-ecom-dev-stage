-- =========================================================
-- TLB Enterprise — Align order creation with public catalogue rules
--
-- Live create_order_with_items (8-arg) still:
--   * looks up products with a UUID cast only
--   * does not reject inactive or soft-deleted products
--   * does not reject non-positive quantities in SQL
-- Quote creation already enforces those checks. Checkout must match
-- so a guessed product id cannot purchase a hidden catalogue row.
--
-- Does not change products.id / order_items.product_id types.
-- Does not change the RPC signature or return type.
-- =========================================================

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

    IF (_item ->> 'product_id') IS NULL OR btrim(_item ->> 'product_id') = '' THEN
      RAISE EXCEPTION 'Product not found';
    END IF;

    -- Live products.id is text. Match as text, then cast for uuid columns.
    SELECT id, name, price, stock_quantity, is_active, deleted_at
    INTO _product
    FROM public.products
    WHERE id = (_item ->> 'product_id')
    FOR UPDATE;

    IF _product.id IS NULL THEN
      RAISE EXCEPTION 'Product % not found', _item ->> 'product_id';
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

    PERFORM public.decrement_stock(_product.id::uuid, _qty, _order_id);
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
