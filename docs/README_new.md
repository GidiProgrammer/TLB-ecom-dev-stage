# TLB Lab Mart

E-commerce platform for TLB Enterprise — laboratory, scientific, industrial and household chemicals, equipment, glassware, PPE and furniture, Accra, Ghana.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for stack, data model, and key design decisions. If you're an AI coding agent working in this repo, also read [`AGENTS.md`](./AGENTS.md).

## Stack

TanStack Start (React 19) · Supabase (Postgres + Auth + RLS) · Tailwind v4 · shadcn/ui

## Local development

Requires Node.js and [bun](https://bun.sh).

```sh
git clone https://github.com/GidiProgrammer/TLB-ecom-dev-stage.git
cd TLB-ecom-dev-stage
bun install
cp .env.example .env   # fill in real values, see below
bun dev
```

## Environment variables

Copy `.env.example` to `.env` and fill in values from your Supabase project (Settings → API):

| Variable | Where it's used | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Client (browser) | Public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client (browser) | Public — safe to expose |
| `SUPABASE_URL` | Server (SSR) | Same URL, non-`VITE_`-prefixed for `process.env` access |
| `SUPABASE_PUBLISHABLE_KEY` | Server (SSR) | Same key, server-side copy |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **Never expose to the client.** Bypasses RLS. |

## Database

Schema lives in `supabase/migrations/`. Apply migrations to a Supabase project via the SQL Editor or `supabase db push`. See `ARCHITECTURE.md` for the data model and the reasoning behind the RLS/role design before making schema changes.

## Scripts

```sh
bun dev          # start dev server
bun run build    # production build
bun run lint     # eslint
bun run format   # prettier
```
