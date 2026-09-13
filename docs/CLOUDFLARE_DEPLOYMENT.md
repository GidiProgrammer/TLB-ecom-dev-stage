# Cloudflare Workers deployment (historical — superseded)

> **Superseded (CP27 Phase 3C).** Production deployment is **GitHub → Vercel** with Nitro preset `vercel`. See [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md).
>
> This file is kept as a record of the former Cloudflare Worker path. Do not follow it for new deploys. `vite.config.ts` no longer uses `cloudflare-module`.

---

# Cloudflare Workers deployment (CP27)

Independent production path **at the time this was written**: **GitHub `main` → Cloudflare Worker**. Lovable is not required to build or deploy.

This document prepared that path. It did **not** perform a production deploy, attach a custom domain, create production secrets, add cron, or add a mail provider.

The sections below describe the **old** Cloudflare Nitro target (`preset: "cloudflare-module"`). They are not the current build.

## What the build already produces

`vite.config.ts` uses Nitro preset `cloudflare-module` with `nodeCompat` and `deployConfig`. `bun run build` / `npm run build` writes:

| Artifact | Role |
|---|---|
| `.output/public/` | Static assets |
| `.output/server/index.mjs` | Worker fetch entry |
| `.output/server/wrangler.json` | Generated Wrangler config (gitignored) |
| `.wrangler/deploy/config.json` | Pointer Nitro writes so Wrangler can find the generated config |

Do not commit `.output/` or `.wrangler/`.

A committed `wrangler.toml` / `wrangler.jsonc` is **not** required. Nitro merges optional root Wrangler files into the generated config, but it **overrides** `main` and `assets`. Extra root config would be redundant unless you later need bindings Nitro cannot express.

Worker name is pinned in Vite as `tlb-ecom` (not an account/zone/domain). Cloudflare account ID, zone ID, and hosts are supplied in the Cloudflare dashboard at first real deploy.

Required compatibility:

- `nodejs_compat` — yes (`process.env` and Node-shaped APIs used by Nitro / Supabase / mail)
- `compatibility_date` — emitted by Nitro from its Cloudflare compatibility date; do not invent one in git
- Assets binding `ASSETS` pointing at `.output/public` (relative from the generated config)
- `main`: `index.mjs` next to generated `wrangler.json`
- `no_bundle: true` — Wrangler uploads Nitro’s already-bundled Worker

There is no Wrangler `[env.production]` split in-repo. Use **one Worker** plus Cloudflare vars/secrets. A second Worker (e.g. staging) can be added later by changing `cloudflare.wrangler.name` or using Wrangler environments **after** a first successful deploy.

## Environment variables

Never commit real values. Never prefix server secrets with `VITE_`. Do not add `.env.production` to the repo.

### Build-time public (Vite inlines into the browser bundle)

Must be present in the **CI/build environment**, not only on the Worker:

| Variable | How to supply |
|---|---|
| `VITE_SUPABASE_URL` | GitHub Actions secret or env at build; same public URL as local `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | GitHub Actions secret or env at build; **anon / publishable** key only |

The Worker cannot change these after the asset/SSR bundle is built.

### Server-only (Worker runtime)

Set as Cloudflare Worker **variables** (non-secret) or **secrets** (encrypted). Prefer secrets for anything that grants access.

| Variable | Cloudflare | Notes |
|---|---|---|
| `SUPABASE_URL` | var or secret | SSR / server functions; same project URL |
| `SUPABASE_PUBLISHABLE_KEY` | var or secret | SSR user-scoped client; **not** service role |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | Bypasses RLS. Server only. |
| `MAIL_DRIVER` | var | Keep `capture` until a real provider is chosen |
| `CONTACT_RECIPIENT_EMAIL` | **secret** | Staff inbox for `contact.submitted` |

Nitro’s Cloudflare module + `nodejs_compat` exposes Worker bindings as `process.env`, which is how `client.server.ts`, auth middleware, and mail read config.

Do **not** set `MAIL_DRIVER=resend` (or any real sender) until a later phase implements that driver.

Optional leftovers (`LOVABLE_CRON_SECRET*`) are unused: there is no scheduler.

### Test-only (never on the Worker)

| Variable | Where |
|---|---|
| `E2E_USER_EMAIL` | Local / CI Playwright only |
| `E2E_USER_PASSWORD` | Local / CI Playwright only |

## Recommended GitHub → Cloudflare method

**Use GitHub Actions + Wrangler** (not Cloudflare’s Git auto-integration, not manual-only as the long-term path).

Why this one:

- GitHub remains source of truth; a workflow file (later phase) makes deploys explicit and reproducible
- Build happens in CI with `VITE_*` from GitHub secrets; Worker secrets stay in Cloudflare
- Compatible with **generated** `.output/server/wrangler.json` (`wrangler deploy --config .output/server/wrangler.json` after `npm run build`)
- Rollback is `wrangler rollback` or redeploy a previous git SHA
- Cloudflare dashboard Git integration expects a root Wrangler file and its own build, which fights Nitro’s generated config
- Manual `npx wrangler deploy` is acceptable for the **first** smoke deploy, then automate the same command

Do not add the workflow in this phase (no existing `.github/` convention to complete).

Suggested later workflow shape (do not create yet):

1. Trigger: `workflow_dispatch` and optionally `push` to `main`
2. Checkout → Node → `npm ci` → `npm run build` with `VITE_*` from GitHub secrets
3. `npx wrangler deploy --config .output/server/wrangler.json` using `CLOUDFLARE_API_TOKEN` (account-scoped, Workers deploy permission only) — token lives in GitHub Secrets, never in git
4. Do not pass `SUPABASE_SERVICE_ROLE_KEY` into Wrangler CLI flags; configure it once in Cloudflare

## Security (independent domain)

These invariants must hold on a real Cloudflare hostname (not only Lovable preview):

- Service role, `CONTACT_RECIPIENT_EMAIL`, and any future mail provider keys stay server-only (`process.env`, Cloudflare secrets). Routes and `src/integrations/supabase/client.ts` must not import `client.server.ts` or `@/server/**` (TanStack `importProtection` errors the build if they do).
- Browser bundle may contain only `VITE_SUPABASE_*` (publishable). RLS remains authoritative for that key.
- `supabaseAdmin` is created in `client.server.ts` and loaded inside `createServerFn` handlers.
- CSRF: `src/start.ts` installs `createCsrfMiddleware` for server functions.
- Auth on a real domain: `brokeredPreviewStorage()` uses `localStorage` unless the hostname is a Lovable preview zone **and** the page is framed by a Lovable editor origin. A Cloudflare `*.workers.dev` or custom domain therefore uses normal Supabase session storage. No Lovable auth broker is required. Do not change that implementation in this phase.

## Runbook (first independent deploy — not executed in CP27)

Replace placeholders locally. Never paste tokens into git or chat logs.

### 1. Build

```sh
# From repo root. Public Vite vars must be set in this shell / CI.
npm ci
npm run typecheck
npm run build
```

Confirm `.output/public`, `.output/server/index.mjs`, and `.output/server/wrangler.json` exist. Inspect the generated JSON for `name`, `main`, `assets`, `compatibility_flags` including `nodejs_compat`. Do not commit it.

### 2. Authenticate to Cloudflare

```sh
npx wrangler login
# or CI: CLOUDFLARE_API_TOKEN in the environment (not committed)
npx wrangler whoami
```

### 3. Configure variables and secrets

In Cloudflare Dashboard → Workers → `tlb-ecom` (created on first deploy) **or** via Wrangler after the first upload:

```sh
# Non-secret example
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config .output/server/wrangler.json
npx wrangler secret put CONTACT_RECIPIENT_EMAIL --config .output/server/wrangler.json
```

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `MAIL_DRIVER=capture` as Worker vars or secrets. Build-time `VITE_*` are **not** set here; they were baked in at step 1.

### 4. Deploy

```sh
npx wrangler deploy --config .output/server/wrangler.json
```

Do not attach a custom domain in this phase unless product explicitly starts that work.

### 5. Verify the Worker

Open the `*.workers.dev` URL Wrangler prints. Check: home/catalog render, sign-in against **your** Supabase project, checkout/quote still go through server functions, contact form still enqueue-only (`MAIL_DRIVER=capture`). Confirm browser network tab does not send a service-role key.

### 6. Roll back

```sh
npx wrangler rollback --config .output/server/wrangler.json
```

Or rebuild and deploy a known-good git SHA. Cloudflare retains prior Worker versions.

## Exact next step (after this phase)

1. Cloudflare account owner runs `npx wrangler login`.
2. Create GitHub secrets for `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (and later `CLOUDFLARE_API_TOKEN`).
3. Create Cloudflare secrets for server-only keys **without** putting them in git.
4. Add a GitHub Actions workflow that builds then `wrangler deploy --config .output/server/wrangler.json`.
5. Run the first deploy from that workflow or a one-off local `wrangler deploy` of the same artifacts.
