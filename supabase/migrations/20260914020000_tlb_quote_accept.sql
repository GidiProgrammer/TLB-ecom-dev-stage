-- =========================================================
-- TLB Enterprise — Informational quote acceptance (forward-only)
--
-- Customer (or staff, via a separate path) may move quoted → accepted.
-- This is an acknowledgement of quoted terms only. No catalogue or
-- checkout mutation.
-- =========================================================

CREATE OR REPLACE FUNCTION public.accept_quote(p_quote_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _quote RECORD;
BEGIN
  IF p_quote_id IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  SELECT id, reference, status
  INTO _quote
  FROM public.quotes
  WHERE id = p_quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  IF _quote.status = 'accepted' THEN
    RETURN jsonb_build_object(
      'quote_id', _quote.id,
      'reference', _quote.reference,
      'status', _quote.status,
      'replayed', true
    );
  END IF;

  IF _quote.status IS DISTINCT FROM 'quoted' THEN
    RAISE EXCEPTION 'Quote cannot be accepted';
  END IF;

  UPDATE public.quotes
  SET status = 'accepted'
  WHERE id = p_quote_id
    AND status = 'quoted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote cannot be accepted';
  END IF;

  RETURN jsonb_build_object(
    'quote_id', _quote.id,
    'reference', _quote.reference,
    'status', 'accepted',
    'replayed', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_quote(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.accept_quote(uuid)
  TO service_role;
