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

**RLS policies are split into "own row" vs "admin/staff" policies, never a single blanket policy.** A regular user can `SELECT`/`INSERT` their own orders/quotes, but cannot `UPDATE` an order's `status` or `total` directly — those columns are only mutable via server-side code using the service-role key, or by an admin/staff RLS policy. This was a deliberate fix for a real gap found in the original Lovable-generated schema, where `FOR ALL` policies let a user edit fields (like their own order's payment status) that only staff should control.

**Orders are created through one atomic Postgres function (`create_order_with_items`), not multiple client-side inserts.** The Supabase JS client cannot wrap several `.insert()`/`.rpc()` calls into a single transaction — each commits independently. A crash between "create order" and "decrement stock" would leave inconsistent data. `create_order_with_items` does everything (order row, order_items rows, stock decrement, stock_movements log) inside one transaction with row-level locking (`FOR UPDATE`), so concurrent checkouts can't oversell the same item. It is `SECURITY DEFINER` and execution is `REVOKE`d from `anon`/`authenticated` — **only** callable via the service-role key from server-side code.

**Order creation goes through a TanStack Start server function (`src/lib/orders.ts`), not a direct client-side Supabase call.** The service-role key must never reach the browser bundle. TanStack Start's Vite plugin enforces this at build time — client code cannot import anything under `**/server/**`; server functions must be declared with `createServerFn` (see that file for the pattern) so the framework can split client/server code correctly. If you hit an "Import denied" error, this is why — don't work around it by moving the import path, fix the function to use `createServerFn`.

**`profiles.approval_status` is protected by a trigger** (`prevent_self_approval`), not just RLS — a user's own-profile `UPDATE` policy would otherwise let them silently approve their own institutional account by including `approval_status: 'approved'` in an unrelated profile edit.

## Environment variables

See `.env.example`. Client-side (Vite-bundled, public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Server-only (never expose): `SUPABASE_SERVICE_ROLE_KEY`.

## Migrations

SQL migrations live in `supabase/migrations/` (Lovable's originals) and were superseded/extended by files applied manually to the production Supabase project (schema + seed + order function — tracked outside this repo for now; consider moving these into `supabase/migrations/` properly as the project matures, so schema history lives in version control like everything else).
