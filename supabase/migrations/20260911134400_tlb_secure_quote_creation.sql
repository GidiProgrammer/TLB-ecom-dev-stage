-- =========================================================
-- TLB Enterprise — Atomic quote creation (forward-only)
--
-- Purpose:
-- Customer quote requests must create a quotes row plus relational
-- quote_items in one transaction. The previous browser insert targeted
-- a non-existent quotes.items JSONB column and let the client choose
-- reference, status, product names, and prices.
--
-- Security model:
-- SECURITY DEFINER with search_path = public. EXECUTE is revoked from
-- PUBLIC, anon, and authenticated. Only service_role (TanStack Start
-- createServerFn → supabaseAdmin) may call this function.
--
-- Signature:
-- public.create_quote_with_items(
--   p_user_id uuid,
--   p_institution text,
--   p_contact_name text,
--   p_contact_email text,
--   p_contact_phone text,
--   p_notes text,
--   p_items jsonb
-- ) RETURNS jsonb
--
-- p_items: [{ "product_id": "<uuid>", "quantity": 1 }, ...]
-- Returns: { "quote_id": "<uuid>", "reference": "QT-YYYYMMDD-XXXXXX" }
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_quote_with_items(
  p_user_id UUID,
  p_institution TEXT,
  p_contact_name TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _quote_id UUID;
  _reference TEXT;
  _item JSONB;
  _product RECORD;
  _qty INTEGER;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create a quote with no items';
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

    -- Live products.id is text (hybrid catalogue). Match as text, then
    -- store the UUID-shaped identifier on quote_items.product_id.
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

    -- Match public catalogue visibility: inactive or soft-deleted products
    -- are not quoteable even if a client guesses their ID.
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

  RETURN jsonb_build_object('quote_id', _quote_id, 'reference', _reference);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_quote_with_items(
  uuid, text, text, text, text, text, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_quote_with_items(
  uuid, text, text, text, text, text, jsonb
) TO service_role;

-- Quote creation is server-only. Customers keep SELECT of their own quotes.
DROP POLICY IF EXISTS "own quotes insert" ON public.quotes;
REVOKE ALL ON public.quotes FROM anon, authenticated;
GRANT SELECT ON public.quotes TO authenticated;
