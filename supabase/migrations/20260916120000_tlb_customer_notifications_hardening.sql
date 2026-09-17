-- =========================================================
-- TLB Enterprise — CP45 hardening (forward-only)
--
-- Tightens customer_notifications href CHECK to match
-- safeInternalPath. Mark-read SECURITY DEFINER functions reject
-- JWT callers whose auth.uid() does not match p_user_id.
-- EXECUTE remains revoked from anon / authenticated.
-- =========================================================

ALTER TABLE public.customer_notifications
  DROP CONSTRAINT IF EXISTS customer_notifications_href_safe;

ALTER TABLE public.customer_notifications
  ADD CONSTRAINT customer_notifications_href_safe CHECK (
    href IS NULL
    OR (
      href LIKE '/%'
      AND href NOT LIKE '//%'
      AND position('://' in href) = 0
      AND position(E'\\' in href) = 0
      AND href !~ E'[\r\n]'
      AND href !~ '^/[a-zA-Z][a-zA-Z0-9+.-]*:'
    )
  );

CREATE OR REPLACE FUNCTION public.mark_customer_notification_read(p_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.customer_notifications
  SET read_at = now()
  WHERE id = p_id
    AND user_id = p_user_id
    AND read_at IS NULL;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_customer_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.customer_notifications
  SET read_at = now()
  WHERE user_id = p_user_id
    AND read_at IS NULL;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_customer_notification_read(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_all_customer_notifications_read(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_customer_notification_read(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_customer_notifications_read(UUID) TO service_role;
