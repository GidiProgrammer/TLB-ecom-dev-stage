## Working in this codebase (for AI agents: Cursor, Claude, etc.)

Read `ARCHITECTURE.md` first for the full picture. The rules below are the ones most likely to get silently violated by a well-intentioned automated edit.

### Hard rules — do not do these, even if it looks like it'd fix something

- **Never call `decrement_stock`, `restock_product`, or `create_order_with_items` from client code.** These are `SECURITY DEFINER` functions with execution revoked from `anon`/`authenticated` on purpose. If a client-side call to one of these fails with a permissions/does-not-exist error, the fix is a server function using `supabaseAdmin` (service-role client from `src/integrations/supabase/client.server.ts`) — not loosening the grant.
- **Never add a client-writable RLS policy for `orders.status`, `orders.total`, or anything in `user_roles`.** If a feature seems to need the client to change one of these, it needs a server-side route instead.
- **Never import anything under `src/server/**` (or similar server-only paths) directly into a route/component file.** TanStack Start's import-protection plugin blocks this at build time on purpose — the fix is always `createServerFn`, never relocating the file to dodge the pattern.
- **Don't reintroduce JSONB blobs for order/quote line items.** `order_items`/`quote_items` are relational on purpose (referential integrity to `products`, queryable quantities, snapshotted price/name). If a task seems to want a JSONB `items` field again, flag it instead of adding one.
- **Scope is e-commerce only.** Don't add purchase-order, VAT-invoice, waybill, or partial-fulfilment concepts to this schema without an explicit go-ahead — that's a separate, currently out-of-scope internal system.

### Conventions

- Schema/RLS changes: write as a new numbered SQL file in `supabase/migrations/` (see naming pattern of existing files), not as an ad hoc one-off script — migration history should live in version control, not only in whoever ran it against the dashboard.
- Server-only logic: `createServerFn` from `@tanstack/react-start`, following the pattern in `src/lib/orders.ts`.
- Data fetching in routes: React Query hooks in `src/lib/queries/`, not direct `supabase.from(...)` calls scattered across components.
- Money/display formatting: `src/lib/catalog-utils.ts` — don't create a second copy of `formatGHS`/`stockLabel` elsewhere.
