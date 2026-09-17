-- =========================================================
-- TLB Enterprise — CP45 customer in-app notifications
--
-- Dedicated table. Does not reuse warehouse public.notifications
-- (CPO / product / ops). Does not alter transactional_email_outbox.
-- Does not change commerce RPCs.
-- =========================================================

CREATE TABLE public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_notifications_event_key_unique UNIQUE (event_key),
  CONSTRAINT customer_notifications_event_type_check CHECK (
    event_type IN (
      'order.created',
      'order.shipped',
      'order.cancelled',
      'order.payment_failed',
      'quote.submitted',
      'quote.quoted',
      'quote.declined',
      'profile.approved',
      'profile.rejected'
    )
  ),
  CONSTRAINT customer_notifications_title_len CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT customer_notifications_body_len CHECK (char_length(body) BETWEEN 1 AND 500),
  CONSTRAINT customer_notifications_href_safe CHECK (
    href IS NULL
    OR (
      href LIKE '/%'
      AND href NOT LIKE '//%'
      AND href NOT LIKE '%://%'
    )
  )
);

COMMENT ON TABLE public.customer_notifications IS
  'Customer-facing in-app notifications for TLB E-com. Separate from warehouse notifications and transactional email.';

COMMENT ON COLUMN public.customer_notifications.event_key IS
  'Idempotency key, aligned with commerce events. One logical event = one row.';

CREATE INDEX customer_notifications_user_created_idx
  ON public.customer_notifications (user_id, created_at DESC);

CREATE INDEX customer_notifications_user_unread_idx
  ON public.customer_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.customer_notifications TO authenticated;
GRANT ALL ON TABLE public.customer_notifications TO service_role;

CREATE POLICY "customers select own notifications"
  ON public.customer_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for authenticated. Clients cannot
-- create notifications or mutate content. Mark-read is RPC-only.

CREATE OR REPLACE FUNCTION public.customer_notifications_protect_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.event_key IS DISTINCT FROM OLD.event_key
      OR NEW.event_type IS DISTINCT FROM OLD.event_type
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.body IS DISTINCT FROM OLD.body
      OR NEW.target_type IS DISTINCT FROM OLD.target_type
      OR NEW.target_id IS DISTINCT FROM OLD.target_id
      OR NEW.href IS DISTINCT FROM OLD.href
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'customer notifications are immutable except read_at';
    END IF;
    IF OLD.read_at IS NOT NULL THEN
      NEW.read_at := OLD.read_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_notifications_protect_columns ON public.customer_notifications;
CREATE TRIGGER customer_notifications_protect_columns
  BEFORE UPDATE ON public.customer_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.customer_notifications_protect_columns();

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
