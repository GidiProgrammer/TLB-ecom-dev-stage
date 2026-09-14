# Customer transactional email (CP26 / CP32)

Source of truth for **customer commerce** email. Warehouse `notifications` is a separate in-app/ops table and must not be used here.

Pipeline:

```text
event → transactional_email_outbox → Vercel Cron → protected processor → MailDriver (capture | resend)
```

Phase 1 shipped the outbox, mail adapter, and capture driver. Later phases wired commerce, lifecycle, profile, and contact events. CP32 adds a Resend production adapter, HTML/text templates, and a Bearer-protected Cron endpoint. No warehouse/ops mail. No in-app inbox. No password reset. No CP22 purchasing/quote policy. No payment provider. There is **no** `quote.accepted` email.

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

Rows are durable in `transactional_email_outbox` and are delivered when the protected processor runs. Preview/staging must use capture so no real customer email is sent.

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

These events are durable in the outbox and delivered by the same processor as other templates.

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

### What is still capture-only on Preview

Preview/staging must keep `MAIL_DRIVER=capture`. Warehouse `notifications` is unused. No password reset. No CP22 change.

Optional later uniqueness (if line-level staff pricing needs its own mail): `quote.price:{quote_item_id}`.

## Phase 2A wiring

`src/lib/orders.ts` and `src/lib/quotes.ts` enqueue after the commerce RPC returns an id. Recipients come from `orders.shipping_email` / `quotes.contact_email`, not from a second trust of the browser payload. Templates: `order-created`, `quote-created`.

Postgres cannot wrap the existing SECURITY DEFINER RPC and the outbox insert in one client transaction. Order of operations: commerce RPC first, then outbox. If enqueue fails, the server logs and still returns the created order/quote so the customer is not prompted to retry (which would duplicate commerce rows). Duplicate `event_key` inserts collapse to the existing outbox row.

## Phase 2B processor

`processTransactionalEmailOutbox` (under `src/server/mail/`) is the only processing entry point. Production invokes it through `GET`/`POST` `/api/cron/transactional-email` (TanStack Start server route, **not** a `createServerFn`). CSRF middleware applies only to server functions, so Cron can call this HTTP route with a Bearer secret.

The route file dynamically loads the handler via `src/lib/cron-transactional-email.ts` so browser route modules do not statically import `src/server/**`.

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

`MAIL_DRIVER=capture` (default, required on Preview) records the attempt in process memory and returns success with `delivered: false`. The processor therefore marks the row `sent` even though **no real email is sent**.

### Resend driver

`MAIL_DRIVER=resend` uses native `fetch` against Resend’s HTTP API (`https://api.resend.com/emails`). It requires server-only `MAIL_PROVIDER_API_KEY` and `MAIL_FROM`. Optional `MAIL_REPLY_TO` is used when the event has no `payload.replyTo`. HTML and plaintext bodies are rendered before send. The outbox `event_key` is sent as the `Idempotency-Key` header.

Unknown `MAIL_DRIVER` values fail closed. There is no silent fallback from `resend` to `capture`.

Provider requests abort after about 8 seconds (`AbortController`). Retryable failures: network errors, timeouts, HTTP 429, HTTP 5xx. Permanent failures: most other 4xx responses and missing configuration. Permanent errors mark the outbox row `failed` without waiting for five attempts.

### Duplicate-send limitation

Delivery is **at-least-once**. The outbox guarantees one row per business event. Provider idempotency protects against duplicate delivery during crash recovery **where the provider honours `Idempotency-Key`**.

Do not claim exactly-once delivery:

- one durable `event_key`
- one active claim at a time
- retries after failure or stale `sending`

If the provider accepts a message and the worker dies before `sent` is written, a later stale recovery may send again.

### Processor HTTP contract

- Missing `CRON_SECRET` → `500`, nothing processed
- Missing or invalid `Authorization: Bearer …` → `401`
- Valid secret → process a fixed batch of **10** (query `limit` is ignored)
- JSON body: `claimed`, `sent`, `retryScheduled`, `permanentlyFailed` only — no addresses, payloads, or provider responses
- Customer JWTs and service-role keys are not accepted as Cron credentials

Vercel Cron (`vercel.json`, `*/5 * * * *`) is intended for **Production**. Preview should not send real mail.

## CP32 configuration

### Preview / staging

```text
MAIL_DRIVER=capture
```

No `MAIL_PROVIDER_API_KEY` required. Do not send real customer email.

### Production

```text
MAIL_DRIVER=resend
MAIL_FROM=<verified TLB domain sender>
MAIL_PROVIDER_API_KEY=<secret>
CRON_SECRET=<high entropy secret>
CONTACT_RECIPIENT_EMAIL=<TLB staff recipient>
```

A verified sending domain is required in Resend before production cutover.

All of the above are server-only (`process.env`). Never use a `VITE_` prefix.

## Payload

Store only what the template needs (order/quote reference, item names, quoted unit prices). Recipient email is on the row for delivery. Do not dump full shipping dossiers or unrelated PII.

## Drivers

`sendTransactionalEmail` lives under `src/server/`. `MAIL_DRIVER=capture` records attempts and never sends. `MAIL_DRIVER=resend` delivers through Resend. Templates are rendered server-side (`html` + `text`) with HTML escaping of untrusted strings. Never put provider secrets on `VITE_*`.
