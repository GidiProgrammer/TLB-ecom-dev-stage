-- =========================================================
-- TLB Enterprise — Order cancel + staff restock (forward-only)
--
-- Cancel restores sellable stock from order_items in the same
-- transaction that sets status = cancelled. Staff restock is a
-- simple stock increase (not warehouse receiving).
--
-- Uniqueness: one return movement per (order, product). The
-- suggested unique (reason, reference_id) would reject a second
-- line on a multi-item order. Live stock_movements had 0 return
-- rows when this was written.
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_order_cancel_return_idx
  ON public.stock_movements (reference_id, product_id)
  WHERE reason = 'return' AND reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order RECORD;
  _item RECORD;
  _product_id TEXT;
  _stock INTEGER;
  _replayed BOOLEAN := false;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT id, reference, status
  INTO _order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF _order.status = 'cancelled' THEN
    _replayed := true;
    RETURN jsonb_build_object(
      'order_id', _order.id,
      'reference', _order.reference,
      'status', _order.status,
      'replayed', true
    );
  END IF;

  IF _order.status NOT IN ('pending', 'paid', 'processing') THEN
    RAISE EXCEPTION 'Order cannot be cancelled';
  END IF;

  FOR _item IN
    SELECT product_id, SUM(quantity)::INTEGER AS quantity
    FROM public.order_items
    WHERE order_id = p_order_id
    GROUP BY product_id
  LOOP
    _product_id := _item.product_id::text;

    SELECT stock_quantity
    INTO _stock
    FROM public.products
    WHERE id = _product_id
    FOR UPDATE;

    IF _stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', _product_id;
    END IF;

    UPDATE public.products
    SET stock_quantity = stock_quantity + _item.quantity
    WHERE id = _product_id;

    INSERT INTO public.stock_movements (
      product_id, change_qty, reason, reference_id, note
    ) VALUES (
      _product_id, _item.quantity, 'return', p_order_id::text, 'order_cancel'
    );
  END LOOP;

  UPDATE public.orders
  SET status = 'cancelled'
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', _order.id,
    'reference', _order.reference,
    'status', 'cancelled',
    'replayed', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_order_and_restore_stock(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_stock(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.staff_restock_product(
  p_product_id TEXT,
  p_qty INTEGER,
  p_note TEXT,
  p_staff_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stock INTEGER;
  _note TEXT;
BEGIN
  IF p_staff_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (
    public.has_role(p_staff_user_id, 'admin')
    OR public.has_role(p_staff_user_id, 'staff')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_product_id IS NULL OR btrim(p_product_id) = '' THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  _note := NULLIF(btrim(p_note), '');
  IF _note IS NULL THEN
    RAISE EXCEPTION 'Restock note is required';
  END IF;

  SELECT stock_quantity
  INTO _stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF _stock IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  UPDATE public.products
  SET stock_quantity = stock_quantity + p_qty
  WHERE id = p_product_id
  RETURNING stock_quantity INTO _stock;

  INSERT INTO public.stock_movements (
    product_id, change_qty, reason, reference_id, note, created_by
  ) VALUES (
    p_product_id, p_qty, 'restock', NULL, _note, p_staff_user_id
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'stock_quantity', _stock
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_restock_product(text, integer, text, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.staff_restock_product(text, integer, text, uuid)
  TO service_role;
