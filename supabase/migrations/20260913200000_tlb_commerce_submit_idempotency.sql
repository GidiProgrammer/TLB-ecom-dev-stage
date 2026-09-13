-- =========================================================
-- TLB Enterprise — Commerce submit idempotency (forward-only)
--
-- Duplicate checkout/quote POSTs (double-click, lost response + retry,
-- two tabs sharing a nonce) each called create_order_with_items /
-- create_quote_with_items with no durable key, so each call inserted
-- a new row and decrement_stock ran again.
--
-- Unique key: commerce_submissions.nonce (globally unique UUID).
-- Ownership: the claim row's user_id + operation. Replay SELECT is
-- scoped to p_user_id + expected operation; a mismatch raises
-- Unauthorized and does not return the other user's entity.
--
-- Claim INSERT and commerce mutation run in the SAME RPC transaction.
-- Success: nonce is bound to order_id / quote_id.
-- Failure: transaction rolls back, nonce is free for retry.
-- Replay after commit: return existing ids, no new lines, no stock decrement.
--
-- Clients have no GRANT on this table. New RPC signatures are
-- service_role only. Prior 8-arg order / 7-arg quote overloads are dropped
-- so callers cannot skip the nonce.
-- =========================================================

CREATE TABLE public.commerce_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('order', 'quote')),
  nonce UUID NOT NULL,
  order_id UUID REFERENCES public.orders (id) ON DELETE RESTRICT,
  quote_id UUID REFERENCES public.quotes (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commerce_submissions_nonce_key UNIQUE (nonce),
  CONSTRAINT commerce_submissions_operation_target CHECK (
    (operation = 'order' AND quote_id IS NULL)
    OR (operation = 'quote' AND order_id IS NULL)
  )
);

CREATE INDEX commerce_submissions_user_operation_idx
  ON public.commerce_submissions (user_id, operation);

ALTER TABLE public.commerce_submissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.commerce_submissions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.commerce_submissions TO service_role;

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_user_id UUID,
  p_institution TEXT,
  p_shipping_name TEXT,
  p_shipping_email TEXT,
  p_shipping_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_items JSONB,
  p_submission_nonce UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _claim RECORD;
  _order_id UUID;
  _reference TEXT;
  _item JSONB;
  _product RECORD;
  _qty INTEGER;
  _line_total NUMERIC(12,2);
  _running_subtotal NUMERIC(12,2) := 0;
  _product_id TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_submission_nonce IS NULL THEN
    RAISE EXCEPTION 'Invalid submission nonce';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create an order with no items';
  END IF;

  BEGIN
    INSERT INTO public.commerce_submissions (user_id, operation, nonce)
    VALUES (p_user_id, 'order', p_submission_nonce);
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  SELECT id, user_id, operation, order_id, quote_id
  INTO _claim
  FROM public.commerce_submissions
  WHERE nonce = p_submission_nonce
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid submission nonce';
  END IF;

  IF _claim.user_id IS DISTINCT FROM p_user_id OR _claim.operation IS DISTINCT FROM 'order' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _claim.order_id IS NOT NULL THEN
    RETURN _claim.order_id;
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

  UPDATE public.commerce_submissions
  SET order_id = _order_id
  WHERE id = _claim.id;

  RETURN _order_id;
END;
$$;

DROP FUNCTION IF EXISTS public.create_order_with_items(
  uuid, text, text, text, text, text, text, jsonb
);

REVOKE EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, jsonb, uuid
) TO service_role;

CREATE OR REPLACE FUNCTION public.create_quote_with_items(
  p_user_id UUID,
  p_institution TEXT,
  p_contact_name TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_notes TEXT,
  p_items JSONB,
  p_submission_nonce UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _claim RECORD;
  _quote_id UUID;
  _reference TEXT;
  _item JSONB;
  _product RECORD;
  _qty INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_submission_nonce IS NULL THEN
    RAISE EXCEPTION 'Invalid submission nonce';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create a quote with no items';
  END IF;

  BEGIN
    INSERT INTO public.commerce_submissions (user_id, operation, nonce)
    VALUES (p_user_id, 'quote', p_submission_nonce);
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  SELECT id, user_id, operation, order_id, quote_id
  INTO _claim
  FROM public.commerce_submissions
  WHERE nonce = p_submission_nonce
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid submission nonce';
  END IF;

  IF _claim.user_id IS DISTINCT FROM p_user_id OR _claim.operation IS DISTINCT FROM 'quote' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _claim.quote_id IS NOT NULL THEN
    SELECT reference INTO _reference
    FROM public.quotes
    WHERE id = _claim.quote_id;

    RETURN jsonb_build_object(
      'quote_id', _claim.quote_id,
      'reference', _reference,
      'replayed', true
    );
  END IF;

  _reference := 'QT-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  INSERT INTO public.quotes (
    user_id,
    reference,
    status,
    notes,
    contact_name,
    contact_email,
    contact_phone,
    institution
  ) VALUES (
    p_user_id,
    _reference,
    'submitted',
    NULLIF(btrim(p_notes), ''),
    NULLIF(btrim(p_contact_name), ''),
    NULLIF(btrim(p_contact_email), ''),
    NULLIF(btrim(p_contact_phone), ''),
    NULLIF(btrim(p_institution), '')
  )
  RETURNING id INTO _quote_id;

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

    SELECT id, name, is_active, deleted_at
    INTO _product
    FROM public.products
    WHERE id = (_item ->> 'product_id')
    FOR UPDATE;

    IF _product.id IS NULL THEN
      RAISE EXCEPTION 'Product not found';
    END IF;

    IF _product.is_active IS NOT TRUE OR _product.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Product is not available';
    END IF;

    INSERT INTO public.quote_items (
      quote_id,
      product_id,
      product_name,
      quantity,
      quoted_price
    ) VALUES (
      _quote_id,
      _product.id::uuid,
      _product.name,
      _qty,
      NULL
    );
  END LOOP;

  UPDATE public.commerce_submissions
  SET quote_id = _quote_id
  WHERE id = _claim.id;

  RETURN jsonb_build_object(
    'quote_id', _quote_id,
    'reference', _reference,
    'replayed', false
  );
END;
$$;

DROP FUNCTION IF EXISTS public.create_quote_with_items(
  uuid, text, text, text, text, text, jsonb
);

REVOKE EXECUTE ON FUNCTION public.create_quote_with_items(
  uuid, text, text, text, text, text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_quote_with_items(
  uuid, text, text, text, text, text, jsonb, uuid
) TO service_role;
