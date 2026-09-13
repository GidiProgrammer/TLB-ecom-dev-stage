-- =========================================================
-- TLB Enterprise — CP26 Phase 1: e-commerce transactional email outbox
--
-- Live audit (types + prior inspections of mothgrmclaowhsiemiuj):
--   public.notifications already exists for warehouse / customer_purchase_orders
--   (title, body, dedupe_key, order_id → CPO, product_id → products).
--   DO NOT reuse that table for customer commerce email.
--
--   products.id is TEXT on production. This migration does not alter it
--   and does not add FKs onto products.
--
-- Outbox is service-role only. No client RLS policies. No grants to
-- anon / authenticated. Does not change warehouse notifications RLS.
-- =========================================================

CREATE TYPE public.transactional_email_status AS ENUM (
  'pending',
  'sending',
  'sent',
  'failed'
);

CREATE TABLE public.transactional_email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  template_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_status public.transactional_email_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  CONSTRAINT transactional_email_outbox_event_key_unique UNIQUE (event_key)
);

COMMENT ON TABLE public.transactional_email_outbox IS
  'Customer e-commerce transactional email outbox. One logical business event = one event_key. Not the warehouse notifications table.';

COMMENT ON COLUMN public.transactional_email_outbox.event_key IS
  'Idempotency key. Examples: order.created:{order_id}, quote.status:{quote_id}:quoted';

COMMENT ON COLUMN public.transactional_email_outbox.payload IS
  'Render data only (references, item names, quoted prices). Do not store full PII dumps.';

CREATE INDEX transactional_email_outbox_pending_idx
  ON public.transactional_email_outbox (created_at)
  WHERE delivery_status = 'pending';

ALTER TABLE public.transactional_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactional_email_outbox FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.transactional_email_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.transactional_email_outbox TO service_role;

-- No policies for anon/authenticated: RLS + revoke means customers cannot
-- SELECT/INSERT/UPDATE/DELETE outbox rows via PostgREST.
-- service_role bypasses RLS and owns enqueue/claim/process.
