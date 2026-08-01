# Deploying Jobotic — free preview link (no domain)

Get a shareable `https://jobotic.vercel.app` link for recruiters. **No domain, no cost, ~15 minutes.**

This uses your existing Clerk **development** instance, which works on any URL. For a real production launch (own domain, `pk_live_` keys, the 803-user migration) see [LAUNCH.md](LAUNCH.md).

---

## Security posture for a public link

Two things worth stating up front, because they drive the setup below.

**1. No secrets are exposed.** Verified against the production bundle:

| Key | In the browser? | |
|---|---|---|
| `CLERK_SECRET_KEY` | ❌ Never | No `NEXT_PUBLIC_` prefix → Next.js never bundles it |
| `OPENROUTER_API_KEY` | ❌ Never | Lives on the Convex deployment only |
| `JSEARCH_API_KEY` | ❌ Never | Convex only |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes | **Public by design** — identifies the app, grants nothing |
| `NEXT_PUBLIC_CONVEX_URL` | ✅ Yes | Public by design |

A `pk_test_…` key in the bundle is expected and safe — same model as a Supabase publishable key.

**2. Billing enforcement stays ON.** A public URL with AI endpoints is an open invitation to burn OpenRouter credits. Enforcement means only subscribers can call the paid actions — and you comp a single demo account so recruiters get in free (Step 5).

Defence in depth, already built and server-enforced per user:

| Feature | Limit |
|---|---|
| Job search | 10 / hour |
| Resume analyze | 20 / hour |
| Resume optimize | 12 / hour |
| Job chat | 60 / hour |
| Resume upload | 20 / hour |

---

## Step 1 — Deploy the Convex backend

```bash
npx convex deploy
```

Free, and needs no domain. Note the production URL it prints (`https://<name>.convex.cloud`).

## Step 2 — Set backend env vars on Convex

These run server-side only and never reach the browser. Set them on the **production** deployment (Convex Dashboard → Settings → Environment Variables, or the CLI):

```bash
npx convex env set CLERK_FRONTEND_API_URL https://<your>.clerk.accounts.dev
npx convex env set OPENROUTER_API_KEY sk-or-...
npx convex env set JSEARCH_API_KEY <openwebninja key>
npx convex env set CLERK_BILLING_ENFORCED true
npx convex env set CLERK_PAID_PLAN pro
# optional
npx convex env set OPENROUTER_MODEL google/gemini-2.5-flash
```

## Step 3 — Deploy to Vercel

Import the repo at [vercel.com/new](https://vercel.com/new), then add these environment variables:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_…` | from `.env.local` |
| `CLERK_SECRET_KEY` | `sk_test_…` | **server-only**, never prefixed |
| `NEXT_PUBLIC_CONVEX_URL` | `https://<name>.convex.cloud` | from Step 1 |
| `NEXT_PUBLIC_CLERK_PAID_PLAN` | `pro` | must match the Clerk plan slug |
| `NEXT_PUBLIC_BILLING_ENFORCED` | `true` | keeps the paywall on |

Deploy → you get `https://<project>.vercel.app`.

## Step 4 — Allow the Vercel URL in Clerk ⚠️

**The most common failure.** A Clerk dev instance is scoped to `localhost` by default, so Google sign-in from a `vercel.app` origin can be rejected.

In the **Clerk Dashboard**, add your Vercel URL as an allowed origin / redirect URL for the development instance. Then test sign-in on the deployed link **before** sharing it.

If Google still misbehaves on the dev instance, email sign-up is a reliable fallback — and Step 5's demo account avoids the issue entirely.

## Step 5 — Create the comped demo account

This is what lets recruiters in without paying, while everyone else stays walled off.

1. **Create the plan** — Clerk Dashboard → **Subscription Plans** → new plan, slug exactly **`pro`**.
2. **Create the demo user** — sign up on your deployed link with an address you control (e.g. `demo@…`). This also creates their Convex row.
3. **Comp the plan** — in Clerk Dashboard → **Users** → that user → assign the `pro` plan manually (no payment).
4. Verify: sign in as the demo user and confirm the AI features work while a second, non-subscribed account is blocked.

## Step 6 — Seed the demo account (optional but recommended)

An empty dashboard undersells the work. This populates it with 3 saved jobs (with match scores and reasons) and 5 applications across the pipeline:

```bash
npx convex env set MIGRATION_SECRET "$(openssl rand -hex 24)"

NEXT_PUBLIC_CONVEX_URL=https://<name>.convex.cloud \
MIGRATION_SECRET=<same value> \
DEMO_EMAIL=demo@yourdomain.com \
npm run seed:demo
```

Idempotent — re-run any time to reset the demo data.

## Step 7 — Clean up

```bash
npx convex env remove MIGRATION_SECRET
```

Once the demo is seeded, remove the privileged surface entirely:

```bash
rm convex/seedDemo.ts convex/migrations.ts
npx convex deploy
```

---

## Sharing it

Give recruiters the URL plus the demo credentials:

> **Live demo:** https://jobotic.vercel.app
> **Sign in:** `demo@…` / `<password>`

Worth calling out in your writeup: Next.js 16 · React 19 · Convex · Clerk (auth + billing) · OpenRouter AI · light/dark theming · a real Supabase→Convex migration of 800+ users.

---

## Costs

| Service | Free tier | Watch out for |
|---|---|---|
| Vercel | Hobby: free | — |
| Convex | Free tier | Generous for a demo |
| Clerk | Free up to ~10k MAU | Dev instance has lower limits |
| OpenRouter | **Pay per token** | The only real cost — capped by the rate limits above |
| OpenWebNinja | Per plan | 1 credit per 10 job results |

Only AI usage costs money, and only subscribers can trigger it.

---

## Troubleshooting

**Google sign-in fails on the Vercel URL** → Step 4; add the origin in Clerk.

**"An active subscription is required."** → Working as intended. Comp the `pro` plan to that user (Step 5.3), or unset `CLERK_BILLING_ENFORCED` to open it up.

**Everything spins / "Not authenticated"** → `CLERK_FRONTEND_API_URL` on Convex must be your Clerk **Frontend API URL**, and the Convex integration must be enabled in Clerk.

**Job search returns nothing** → `JSEARCH_API_KEY` must be set on the **Convex** deployment (not Vercel — search runs in a Convex action).

**Seed says "No Convex user for …"** → that account must sign in once before seeding.
