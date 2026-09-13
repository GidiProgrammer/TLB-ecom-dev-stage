# Vercel deployment (CP27)

Independent production path: **GitHub → Vercel → TanStack Start + Nitro → Supabase**. Lovable is not required to build or deploy.

This document prepares the path. It does **not** perform a production deploy, attach a custom domain, add Vercel Cron, or add a mail provider.

## What the build produces

`vite.config.ts` loads Nitro only for `vite build`, with preset **`vercel`**. That is the Vercel Node/Fluid function target (not Edge). `bun run build` / `npm run build` writes the [Vercel Build Output API](https://vercel.com/docs/build-output-api/v3):

| Artifact | Role |
|---|---|
| `.vercel/output/config.json` | Routing / function config |
| `.vercel/output/functions/` | Server (SSR + server functions) |
| `.vercel/output/static/` | Public/static assets |

Nitro may still write an intermediate `.output/` directory during the build. **Do not** set Vercel’s Output Directory to `.output`. Leave framework detection / output handling to the TanStack Start + Nitro integration so Vercel consumes `.vercel/output`.

Do not commit `.vercel/`, `.output/`, or `.env*`.

A committed `vercel.json` is **not** required when the Vercel project framework preset is **TanStack Start**. Add one only if detection fails (`{ "framework": "tanstack-start" }`).

There is no Vercel Cron configuration in this repo. `src/server.ts` remains a fetch adapter; it is not a scheduler.

## Environment variables

Never commit real values. Never prefix server secrets with `VITE_`. Do not add `.env.production` to the repo.

### Build-time public (Vite inlines into the browser bundle)

Must be present in the **Vercel build environment**, not only at function runtime:

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | Same public URL as local `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **anon / publishable** key only |

Changing these requires a rebuild.

### Server-only (function runtime)

Set in the Vercel project for **Production** and **Preview** as appropriate. Prefer Sensitive for anything that grants access.

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | SSR / server functions; same project URL |
| `SUPABASE_PUBLISHABLE_KEY` | SSR user-scoped client; **not** service role |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS. Server only. |
| `MAIL_DRIVER` | Keep `capture` until a real provider is chosen |
| `CONTACT_RECIPIENT_EMAIL` | Staff inbox for `contact.submitted` |

Application code reads these via `process.env` (auth middleware, `client.server.ts`, mail). That works on Vercel Node functions without a Cloudflare env adapter.

Do **not** set `MAIL_DRIVER=resend` (or any real sender) until a later phase implements that driver.

Optional leftovers (`LOVABLE_CRON_SECRET*`) are unused: there is no scheduler.

### Test-only (never on Vercel)

| Variable | Where |
|---|---|
| `E2E_USER_EMAIL` | Local / CI Playwright only |
| `E2E_USER_PASSWORD` | Local / CI Playwright only |

## Recommended GitHub → Vercel method

**Use Vercel’s GitHub integration** (import the repo; deploy on push). Do not use Cloudflare Wrangler for this target.

Why this one:

- GitHub remains source of truth
- Vercel runs `npm run build` (`vite build`) with `VITE_*` from project env
- Nitro emits `.vercel/output`; Vercel deploys it without a custom Output Directory
- Preview deployments per PR/branch; production from the production branch
- Rollback is restoring a previous Vercel deployment or redeploying a known git SHA

Suggested later setup (do not execute in the switch-target checkpoint):

1. Import the GitHub repo in Vercel; confirm framework **TanStack Start**
2. Set build-time `VITE_*` and runtime server env vars in the Vercel project
3. First deploy should be a **Preview**, not production
4. Add the preview URL (and later the production URL) to Supabase Auth redirect allow-lists

## Security (independent domain)

- Service role, `CONTACT_RECIPIENT_EMAIL`, and any future mail provider keys stay server-only (`process.env`). Routes and `src/integrations/supabase/client.ts` must not import `client.server.ts` or `@/server/**` (TanStack `importProtection` errors the build if they do).
- Browser bundle may contain only `VITE_SUPABASE_*` (publishable). RLS remains authoritative for that key.
- `supabaseAdmin` is created in `client.server.ts` and loaded inside `createServerFn` handlers.
- CSRF: `src/start.ts` installs `createCsrfMiddleware` for server functions. Default check is same-origin vs `request.url`. Do not weaken it. If a preview host ever mismatches, configure an explicit public `origin` — do not disable origin checks.
- Auth on a real Vercel hostname: `brokeredPreviewStorage()` uses `localStorage` unless the hostname is a Lovable preview zone **and** the page is framed by a Lovable editor origin. `*.vercel.app` and custom domains therefore use normal Supabase session storage. No Lovable auth broker is required.

## Supabase Auth URLs

When a Preview or Production hostname exists, add it in the Supabase project:

- Site URL (production)
- Additional Redirect URLs (preview `https://*.vercel.app` and the eventual custom domain)

This is dashboard configuration, not an application code change.

## Preview vs production

| | Preview | Production |
|---|---|---|
| Trigger | Non-production git refs / Vercel Preview | Production branch |
| URL | `*.vercel.app` deployment URL | Production domain (later) |
| Env | Same keys; Preview env in Vercel | Production env in Vercel |
| Mail | `MAIL_DRIVER=capture` | Still `capture` until a provider checkpoint |
| Cron | None | None |

## Runbook (first preview — not executed in CP27 Phase 3C)

Replace placeholders locally. Never paste tokens into git or chat logs.

### 1. Build locally

```sh
npm ci
npm run typecheck
npm run build
```

Confirm `.vercel/output/config.json`, `.vercel/output/functions/`, and `.vercel/output/static/` exist. Do not treat `.output/server/wrangler.json` as the deploy artifact (it must not be generated for this target). Do not commit `.vercel/`.

### 2. Vercel project (preview only)

- Framework: TanStack Start
- Build command: default (`npm run build` / `vite build`)
- **Do not** set Output Directory to `.output`
- Node: LTS matching local (20/22/24)

### 3. Environment variables

Set `VITE_SUPABASE_*` for the build, and server-only keys for functions. Keep `MAIL_DRIVER=capture`.

### 4. Deploy preview

Use the Vercel dashboard Git integration or `vercel` (preview). Do **not** promote to production in this phase. Do not attach a custom domain.

### 5. Verify the preview

Open the `*.vercel.app` URL. Check: home/catalog render, sign-in against **your** Supabase project, checkout/quote still go through server functions, contact form still enqueue-only. Confirm the browser network tab does not send a service-role key.

### 6. Roll back

In Vercel: promote/restore a previous deployment, or redeploy a known-good git SHA.

## Exact next step (after this phase)

1. Owner creates or links a Vercel project to this GitHub repo (framework TanStack Start).
2. Set Vercel env vars (build-time `VITE_*`, runtime server secrets) without putting them in git.
3. Deploy a **Preview** only.
4. Add the preview origin to Supabase Auth allow-lists.
5. Production, custom domain, cron, and a real mail provider remain later checkpoints.
