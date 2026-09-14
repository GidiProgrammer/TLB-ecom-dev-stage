# TLB Lab Mart — Architecture

## What this is

Customer-facing e-commerce site for TLB Enterprise (laboratory/scientific supplies, Accra, Ghana). Scope is **e-commerce only** — catalog, cart, checkout, quotes, accounts. A separate internal stock/warehouse/invoicing system (partial order fulfilment, purchase orders, VAT invoicing) exists as a future, distinct project — do not conflate the two or add PO/invoice/waybill concepts here without an explicit decision to expand scope.

## Stack

- **Framework**: TanStack Start (React 19, TanStack Router + Query, Vite, Nitro server)
- **Database/Auth**: Supabase (Postgres + Row Level Security)
- **Styling**: Tailwind v4, shadcn/ui (Radix primitives)
- **Package manager**: bun (see `bun.lock`) — `package-lock.json` also present, prefer bun for installs

## Data model overview

- `profiles` — one row per auth user. `account_type` (individual/institutional) drives `approval_status`; institutional signups start `pending` and must be approved by an admin (enforced by a trigger — see below).
- `categories` / `products` — public catalog. `products.stock_quantity` is the live inventory count.
- `stock_movements` — append-only audit log of every stock change (sale, restock, adjustment). Never write to `products.stock_quantity` directly outside `decrement_stock()`/`restock_product()`.
- `orders` / `order_items` — one order, many line items, each item snapshots `product_name`/`unit_price` at time of purchase (so later price changes don't retroactively alter historical orders).
- `quotes` / `quote_items` — parallel structure for quote requests (no payment, staff-priced).
- `user_roles` — separate table (not a column on `profiles`) mapping `user_id` → `admin`/`staff`. Deliberately isolated with no client-facing RLS policy at all — only `service_role` can read/write it. This is the standard Supabase pattern to prevent privilege escalation via a user editing their own row.
- `experiments` — low-risk, fully user-owned scratch/notes feature. Not security-sensitive.

## Key design decisions (the "why")

**RLS policies are split into "own row" vs "admin/staff" policies, never a single blanket policy.** A regular user can `SELECT` their own orders/quotes. They cannot `INSERT`/`UPDATE`/`DELETE` those rows from the browser — commerce writes go through service-role RPCs (`create_order_with_items`, `create_quote_with_items`, `accept_quote`, `cancel_order_and_restore_stock`). Staff mutations use TanStack Start server functions and `supabaseAdmin`. This was a deliberate fix for Lovable-era `FOR ALL` policies that let a user edit fields (like their own order's payment status) that only staff should control. Forward-only migration `20260914140000_tlb_client_commerce_write_lock.sql` drops those leftover policies and restates SELECT-only grants.

**Orders are created through one atomic Postgres function (`create_order_with_items`), not multiple client-side inserts.** The Supabase JS client cannot wrap several `.insert()`/`.rpc()` calls into a single transaction — each commits independently. A crash between "create order" and "decrement stock" would leave inconsistent data. `create_order_with_items` does everything (order row, order_items rows, stock decrement, stock_movements log) inside one transaction with row-level locking (`FOR UPDATE`), so concurrent checkouts can't oversell the same item. It is `SECURITY DEFINER` and execution is `REVOKE`d from `anon`/`authenticated` — **only** callable via the service-role key from server-side code.

**Order creation goes through a TanStack Start server function (`src/lib/orders.ts`), not a direct client-side Supabase call.** The service-role key must never reach the browser bundle. TanStack Start's Vite plugin enforces this at build time — client code cannot import anything under `**/server/**`; server functions must be declared with `createServerFn` (see that file for the pattern) so the framework can split client/server code correctly. If you hit an "Import denied" error, this is why — don't work around it by moving the import path, fix the function to use `createServerFn`.

**`/auth` stays `ssr: false`.** Enabling SSR for that route made the password-recovery UI fail to appear on first click (E2E) and did not remove the Header/Footer `data-status` hydration warning. Protected routes still use `getUser()` in `beforeLoad`; this mismatch is cosmetic. Do not swap that check for `getSession()`.

**`profiles.approval_status` is protected by a trigger** (`prevent_self_approval`), not just RLS — a user's own-profile `UPDATE` policy would otherwise let them silently approve their own institutional account by including `approval_status: 'approved'` in an unrelated profile edit.

**Customer transactional email** uses `transactional_email_outbox`, not warehouse `notifications`. See `docs/TRANSACTIONAL_EMAIL.md`. Mail code lives under `src/server/mail/` (never import from routes). After commerce RPCs commit, `order.created` / `quote.created` are enqueued. Staff status *transitions* enqueue quote quoted/declined and order shipped/cancelled/payment_failed. Admin-only `approval_status` transitions enqueue profile approved/rejected (account notice only; not CP22 rights). Public contact uses `submitContact` → `contact.submitted` to `CONTACT_RECIPIENT_EMAIL` (customer address is reply-to only). A protected HTTP processor (`/api/cron/transactional-email`) claims rows and delivers via capture or Resend.

## Environment variables

See `.env.example` and [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md). Client-side (Vite-bundled, public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Server-only (never expose): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MAIL_DRIVER`, `MAIL_FROM`, `MAIL_REPLY_TO`, `MAIL_PROVIDER_API_KEY`, `CONTACT_RECIPIENT_EMAIL`, `CRON_SECRET`.

Production is intended to be **GitHub → Vercel** (TanStack Start + Nitro `vercel` preset), independently of Lovable. Do not commit `.env.production` or Vercel secrets. The former Cloudflare Worker path is historical; see [`CLOUDFLARE_DEPLOYMENT.md`](./CLOUDFLARE_DEPLOYMENT.md).

## Migrations

SQL lives in `supabase/migrations/`. That folder is **not** a safe one-shot replay against an empty or live database.

Three layers exist:

1. **Legacy Lovable files** (`20260826*`) — original CREATE TABLE / `FOR ALL` policies. They conflict with later numbered schema if applied together.
2. **Numbered core files** (`001`–`004`) — catalogue/orders/quotes schema, seed, and early order RPC. Applied historically to the live project.
3. **Forward-only hardening** (`20260910*` onward) — RLS/GRANT locks, secure RPCs, idempotency, cancel/restock, quote accept, outbox, client write lock. These assume the live database already has the core e-commerce tables.

**Do not** run a blind `supabase db push` of the whole directory. **Do not** rewrite historical migration files.

For an existing production/live Supabase project: apply any **new** `20260914*` (and later) forward-only files deliberately in the SQL editor or via a targeted CLI push of those files only, after confirming they are not already applied.

A greenfield database cannot currently be constructed by replaying this folder from scratch. Treat the live project as the source of schema truth and keep new changes forward-only in git.
