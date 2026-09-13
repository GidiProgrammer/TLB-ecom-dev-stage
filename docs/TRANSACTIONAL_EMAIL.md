# Customer transactional email (CP26)

Source of truth for **customer commerce** email. Warehouse `notifications` is a separate in-app/ops table and must not be used here.

Phase 1 ships the outbox, mail adapter, and capture driver. Phase 2A wires **order.created** and **quote.created** after the existing SECURITY DEFINER commerce RPCs commit. Phase 2B adds a **manual, server-only** outbox processor (claim → send via adapter → sent/failed) with bounded retries. There is **no cron or continuously running worker**. No warehouse/ops mail. No in-app inbox. No password reset. No CP22 purchasing/quote policy. No payment provider. No real email provider.

## Invariant

One logical business event → **one** `transactional_email_outbox` row, keyed by unique `event_key`.

## Event types (future wiring)

| `event_type` | Recommended `event_key` | Meaning |
| --- | --- | --- |
| `order.created` | `order.created:{order_id}` | Order was recorded. Does **not** mean online payment succeeded. |
| `quote.created` | `quote.created:{quote_id}` | Quote request submitted. |
| `quote.quoted` | `quote.status:{quote_id}:quoted` | Staff quoted **item prices**. Not an invoice and not a payment total. |
| `quote.declined` | `quote.status:{quote_id}:declined` | Quote declined. |
| `profile.approved` | `profile.approval:{profile_id}:approved` | Account approval only. Does **not** grant CP22 institutional purchasing/quote rights. |
| `profile.rejected` | `profile.approval:{profile_id}:rejected` | Account not approved. Same: no CP22 rights implication. |
| `order.shipped` | `order.shipped:{order_id}` | Order marked shipped. |
| `order.cancelled` | `order.cancelled:{order_id}` | Order cancelled. |
| `order.payment_failed` | `order.payment_failed:{order_id}` | Payment failed **if/when** a payment path exists. Status-only in Phase 3A; no payment provider. |
| `contact.submitted` | `contact.submitted:{enquiry_id}` | Inbound website enquiry for TLB staff. Server-generated UUID; not a commerce entity. |

Optional later uniqueness (if line-level staff pricing needs its own mail): `quote.price:{quote_item_id}`.

## Phase 3A lifecycle wiring

Staff mutations in `src/lib/admin-ops.ts` (`updateOrderStatus`, `updateQuoteStatus`) remain behind `requireSupabaseAuth` + `loadStaffAccess`. After the status row actually changes, the handler loads the authoritative recipient (`orders.shipping_email` / `quotes.contact_email`) and enqueues at most one event.

| Transition into | `event_key` | `template_id` | Recipient |
| --- | --- | --- | --- |
| quote `quoted` | `quote.status:{quote_id}:quoted` | `quote-quoted` | `quotes.contact_email` |
| quote `declined` | `quote.status:{quote_id}:declined` | `quote-declined` | `quotes.contact_email` |
| order `shipped` | `order.shipped:{order_id}` | `order-shipped` | `orders.shipping_email` |
| order `cancelled` | `order.cancelled:{order_id}` | `order-cancelled` | `orders.shipping_email` |
| order `payment_failed` | `order.payment_failed:{order_id}` | `order-payment-failed` | `orders.shipping_email` |

Events represent **transitions**, not current state. `quoted → quoted` or `shipped → shipped` does not enqueue. Unique `event_key` is the database idempotency guard if the same transition is attempted twice.

`updateQuoteItemPrice` does **not** enqueue. Line prices can be saved while the quote stays `submitted`/`reviewed`. The `quoted` email fires when staff set status to `quoted`. Completeness of every line price is not enforced by email (same as the existing admin UI).

Payloads are notices only (`quote_ready`, `quote_declined`, `order_shipped`, `order_cancelled`, `payment_failed`) plus `reference`. They do not claim invoices, shipments from the warehouse, refunds, or that an online payment was attempted. `payment_failed` is wired to the existing order-status enum; there is still no payment provider.

Enqueue is post-commit and best-effort (`notifyAfterCommerceCommit`). A failed outbox write is logged; the staff mutation still succeeds so they are not pushed into a duplicate status retry.

Rows are durable in `transactional_email_outbox` but **are not delivered** until something calls `processTransactionalEmailOutbox`. Capture never sends real email. No cron/worker in this phase.

## Phase 3B profile approval wiring

`updateProfileApproval` remains **admin-only** (`loadStaffAccess` then `if (!access.isAdmin)`). Staff can still update orders/quotes; they cannot approve accounts. RLS, `prevent_self_approval`, `account_type`, and CP22 institutional policy are unchanged.

After `profiles.approval_status` actually changes, the handler loads the recipient from **Supabase Auth** (`auth.admin.getUserById(profile.id)` → `user.email`). `profiles` has no email column. The browser never supplies the recipient.

| Transition into | `event_key` | `template_id` |
| --- | --- | --- |
| `approved` | `profile.approval:{profile_id}:approved` | `profile-approved` |
| `rejected` | `profile.approval:{profile_id}:rejected` | `profile-rejected` |

`approved → approved` and `rejected → rejected` do not enqueue. Unique `event_key` still collapses duplicate inserts.

Payload is `{ notice: "account_approved" \| "account_rejected" }` plus `fullName` when present. No rejection reason, appeal copy, purchasing rights, or CP22 meaning.

Enqueue is post-commit and best-effort. A failed outbox write is logged; the approval/rejection still succeeds.

These events are durable in the outbox only. Capture does not send real email. There is still no scheduled worker.

## Phase 4 contact form

Public `POST` via `submitContact` in `src/lib/contact.ts` (a `createServerFn`). The route must not import `src/server/**`. Validation, rate limiting, and enqueue run on the server only.

This is an **inbound enquiry to TLB staff**, not a customer commerce notice.

| `event_type` | `event_key` | `template_id` | Recipient |
| --- | --- | --- | --- |
| `contact.submitted` | `contact.submitted:{enquiry_id}` | `contact-submitted` | `CONTACT_RECIPIENT_EMAIL` |

`enquiry_id` is a server-generated UUID. Do not derive the key from email or message text. There is no commerce entity.

### Recipient and reply-to

- Staff `to` comes only from server-only `CONTACT_RECIPIENT_EMAIL` (no `VITE_` prefix). If missing or not a valid email, submission fails with a configuration error. Nothing is routed to a fallback.
- The customer's email is untrusted. It is stored as payload `email` / `replyTo` so a future provider can set Reply-To. It must never be `From`, envelope sender, or destination.
- Capture records `replyTo` when the processor runs. Capture still does not deliver mail.
- Subjects for this template are a fixed `"Website enquiry"` (not user-controlled). User strings with CR/LF/NUL are rejected.

### Validation

Existing form fields only: required name, email, message; optional phone and institution. Strings are trimmed. Email format is checked. Max lengths: name/email/institution 200, phone 50, message 2000. A hidden honeypot (`website`) is rejected if filled; it is not the only protection.

### Rate limiting

In-process sliding window: **5 submissions per hashed email per 15 minutes**, and **20 per hashed client IP per 15 minutes** when an IP header is present. State is a bounded in-memory map. Browser flags cannot disable it.

Limitation: this is **not** distributed. Multiple server instances each have their own counters. There is no Redis/Postgres rate table in this checkpoint.

### Success and failure

Enqueue happens after validation. A successful response means the enquiry was **accepted into the outbox**, not that email was delivered. Enqueue failure is not swallowed and is not reported as success. Internal database/mail errors are mapped to a generic customer message. Logs use the enquiry id, not the full message or email.

Outbox payload (privileged, not queried from the client): `enquiryId`, `name`, `email`, `message`, optional `phone`/`institution`, `replyTo`. No IP, cookies, tokens, or service-role secrets.

### What is still not running

`MAIL_DRIVER=capture`. No real provider. No cron/worker. Warehouse `notifications` is unused. No password reset. No CP22 change.

Optional later uniqueness (if line-level staff pricing needs its own mail): `quote.price:{quote_item_id}`.

## Phase 2A wiring

`src/lib/orders.ts` and `src/lib/quotes.ts` enqueue after the commerce RPC returns an id. Recipients come from `orders.shipping_email` / `quotes.contact_email`, not from a second trust of the browser payload. Templates: `order-created`, `quote-created`.

Postgres cannot wrap the existing SECURITY DEFINER RPC and the outbox insert in one client transaction. Order of operations: commerce RPC first, then outbox. If enqueue fails, the server logs and still returns the created order/quote so the customer is not prompted to retry (which would duplicate commerce rows). Duplicate `event_key` inserts collapse to the existing outbox row.

## Phase 2B processor

`processTransactionalEmailOutbox` (under `src/server/mail/`) is the only processing entry point. It is not imported from routes and is not scheduled.

### Claim

Postgres: `claim_transactional_email_outbox` (`SECURITY DEFINER`, execute granted to `service_role` only) selects eligible rows with `FOR UPDATE SKIP LOCKED`, then sets `delivery_status = sending` and increments `attempt_count` in the same statement. Two workers cannot claim the same row at once.

Eligible rows:

- `pending` and `next_attempt_at <= now()` and `attempt_count < 5`
- `sending` whose `updated_at` is older than **10 minutes** (stale claim after a crash) and `attempt_count < 5`

Stale `sending` rows that already reached 5 attempts are marked `failed` without another send.

The in-memory test backend uses the same compare-and-swap rules.

### Delivery states

| Status | Meaning |
| --- | --- |
| `pending` | Enqueued or waiting for backoff. Eligible when `next_attempt_at` is due. |
| `sending` | Claimed by a processor attempt. |
| `sent` | Adapter returned successfully. `sent_at` set. `last_error` cleared. |
| `failed` | Permanent after 5 attempts. Row is kept. Not auto-retried. |

Retries **update the same row**. They do not insert another `event_key`.

### Retry / backoff

Maximum attempts: **5**. After a failed send with attempts remaining, status returns to `pending` and `next_attempt_at` is set with exponential backoff from a 60s base, capped at 15 minutes (60s, 120s, 240s, 480s, …). Timing is deterministic from the supplied/current clock.

### Capture driver

`MAIL_DRIVER=capture` (default) records the attempt in process memory and returns success with `delivered: false`. The processor therefore marks the row `sent` even though **no real email is sent**. Production providers are not implemented.

### Duplicate-send limitation

This is **at-least-once after crash**, not exactly-once:

- one durable `event_key`
- one active claim at a time
- retries after failure or stale `sending`

If the adapter/provider accepts a message and the worker dies before `sent` is written, a later stale recovery may send again. Do not treat this as provider-level exactly-once delivery.

### What is not running

There is **no scheduled worker or cron**. Rows stay in the outbox until something server-side calls the processor. This is not production-grade guaranteed delivery.

## Phase 5 — production delivery infrastructure (audit)

**Nothing in the current deployment will invoke `processTransactionalEmailOutbox`.** Capture remains the only driver. This phase does **not** add a cron route, worker, provider, or invented scheduler.

### What the repository and Lovable project prove

- The app is **TanStack Start** (`tech_stack: tanstack_start_ts_current`), connected to Lovable project `e19d5b65-2ade-41fe-b3c2-0e8f5c6fe839`. Preview: `*.lovable.app`. `is_published` was **false** at audit time (preview only; no documented production publish URL in-repo).
- Production **build target is Cloudflare Workers via Nitro** (`vite.config.ts` comment; generated `.output/server/wrangler.json` with `nodejs_compat`, worker name `gidiprogrammer-tlb-ecom-dev-stage`). There is **no `vercel.json`**, no GitHub Actions, no committed `wrangler.toml`, and generated wrangler config has **no `triggers.crons`**. `src/server.ts` implements `fetch` only — no `scheduled` handler.
- Data: linked Supabase `mothgrmclaowhsiemiuj` (`supabase/config.toml`). Lovable Cloud database is enabled (`stack: supabase`). There is **no `supabase/functions/`** directory.
- Server work today is **request-scoped**: `createServerFn` handlers and SSR. CSRF in `src/start.ts` applies to **server functions**, not a hypothetical HTTP cron.
- `src/integrations/supabase/cron-auth.ts` is **auto-generated** and **unused**. It requires server-only `LOVABLE_CRON_SECRET` (optional rotation via `LOVABLE_CRON_SECRET_PREVIOUS`), `Authorization: Bearer …`, SHA-256 + `timingSafeEqual`. Missing secret → 500. Bad/missing token → 401. Suitable for a future HTTP worker; it is not a scheduler. Those vars are listed in `.env.example` (no `VITE_`). They are **not** set in local `.env` at audit time.

### What it does not prove

- That Lovable will call any app URL on a timer with `LOVABLE_CRON_SECRET`.
- That Lovable Cloud **Jobs** (Cloud tab; create via Lovable chat/SQL) run inside this Worker or call `processTransactionalEmailOutbox`. Official Jobs docs describe the **built-in Cloud backend**, not this Nitro worker.
- That adding a Cloudflare cron to wrangler would be honored by Lovable hosting.
- A live production hostname that an external scheduler could hit.

Lovable docs also mention **Inngest** as an optional connector (not present in this repo) and third-party HTTP cron as an unofficial pattern. Neither is configured here.

### Safest architecture when a scheduler *is* available

Do not run an unbounded loop. One bounded pass:

1. Authenticate with existing `authenticateCronRequest` (not customer JWT).
2. `processTransactionalEmailOutbox({ limit: 10 })` — reuse claim/`SKIP LOCKED`/retry policy; do not duplicate it.
3. Log/return counts only: `claimed`, `sent`, `retryScheduled`, `permanentlyFailed`. No payloads, emails, or secrets.
4. HTTP 200 with that summary even if some rows retry/fail (the processor already records per-row outcome).
5. Cadence: **every 5 minutes** is enough vs 60s backoff / 15m cap / 10m stale recovery. Tighter than 1 minute is unnecessary given Worker/credit cost.

Preferred invocation, in order, once **proven** on the real host:

1. **Option B** — protected TanStack **server route** (not a `createServerFn`; CSRF would block external callers) invoked by a platform or external scheduler with Bearer `LOVABLE_CRON_SECRET`.
2. **Option A** — Cloudflare Worker `scheduled` + wrangler crons, only if Lovable/Nitro deploy actually registers them.
3. **Option E** — Supabase scheduled Edge Function, only if we accept a second runtime that must hold the same secrets and call the same processor (or HTTP to the app). Not present today.
4. **Option D** — dedicated worker process: not in this hosting model.

Do **not** use customer session cookies. Do not take batch size or event IDs from the request. Concurrent runs are already safe via `FOR UPDATE SKIP LOCKED`.

### Must be configured before implementing a scheduler

1. Confirm **where production is published** (Lovable publish vs Cloudflare vs other) and the **canonical HTTPS origin**.
2. Confirm **who will HTTP-call or `scheduled`-invoke** the worker (Lovable Jobs vs Cloudflare cron vs external cron vs Inngest) with a real test that is not a guess.
3. Set server-only `LOVABLE_CRON_SECRET` (and rotation secret if needed) in that host’s secret store — never `VITE_`.
4. Keep `MAIL_DRIVER=capture` until a later provider checkpoint.

Until those are true, enqueue remains durable and **delivery is still manual/unscheduled**.

## Payload

Store only what the template needs (order/quote reference, item names, quoted unit prices). Recipient email is on the row for delivery. Do not dump full shipping dossiers or unrelated PII.

## Drivers

`sendTransactionalEmail` lives under `src/server/`. Default driver is **capture** (records the attempt, never sends). A production provider (e.g. Resend) can be added later without importing it from routes. Never put provider secrets on `VITE_*`.
