-- =========================================================
-- TLB Enterprise — CP26 Phase 2B: outbox claim / retry columns
--
-- Forward-only. Does not rewrite Phase 1 outbox migration.
-- Does not touch warehouse notifications or commerce RLS.
-- =========================================================

ALTER TABLE public.transactional_email_outbox
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.transactional_email_outbox.next_attempt_at IS
  'When this row is next eligible to claim. Pending rows start immediately eligible.';

COMMENT ON COLUMN public.transactional_email_outbox.updated_at IS
  'Last status change. Used to recover stale sending claims after a worker crash.';

CREATE INDEX IF NOT EXISTS transactional_email_outbox_claim_idx
  ON public.transactional_email_outbox (next_attempt_at, created_at)
  WHERE delivery_status IN ('pending', 'sending');

-- Atomic claim: pending+due or stale sending. SKIP LOCKED so two workers
-- cannot claim the same row. Does not send mail.
CREATE OR REPLACE FUNCTION public.claim_transactional_email_outbox(
  p_limit INTEGER DEFAULT 10,
  p_stale_after INTERVAL DEFAULT INTERVAL '10 minutes',
  p_max_attempts INTEGER DEFAULT 5
)
RETURNS SETOF public.transactional_email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 10;
  END IF;
  IF p_max_attempts IS NULL OR p_max_attempts < 1 THEN
    p_max_attempts := 5;
  END IF;

  UPDATE public.transactional_email_outbox
  SET
    delivery_status = 'failed',
    updated_at = now()
  WHERE delivery_status = 'sending'
    AND updated_at <= now() - p_stale_after
    AND attempt_count >= p_max_attempts;

  RETURN QUERY
  WITH picked AS (
    SELECT o.id
    FROM public.transactional_email_outbox AS o
    WHERE o.attempt_count < p_max_attempts
      AND (
        (o.delivery_status = 'pending' AND o.next_attempt_at <= now())
        OR (
          o.delivery_status = 'sending'
          AND o.updated_at <= now() - p_stale_after
        )
      )
    ORDER BY o.created_at ASC
    FOR UPDATE OF o SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.transactional_email_outbox AS target
  SET
    delivery_status = 'sending',
    attempt_count = target.attempt_count + 1,
    updated_at = now()
  FROM picked
  WHERE target.id = picked.id
  RETURNING target.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_transactional_email_outbox(integer, interval, integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_transactional_email_outbox(integer, interval, integer)
  TO service_role;

ALTER TABLE public.transactional_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactional_email_outbox FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.transactional_email_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.transactional_email_outbox TO service_role;
