# Jobotic — Setup Guide

Get Jobotic running locally, end to end. Follow the steps top to bottom and you'll be at a working app in ~20 minutes. Every command is copy‑paste.

> **You need 4 free accounts** (Clerk, Convex, OpenRouter, OpenWebNinja). Billing is built in via **Clerk Billing** — no separate account. Links are in [Step 2](#step-2--create-the-accounts).

---

## TL;DR (the whole thing)

```bash
# 0. Install + create .env.local
npm run setup

# 1. Fill in .env.local with your keys (Step 3 below)

# 2. Log in + create your Convex backend (writes Convex URLs into .env.local)
npx convex login
npm run dev:convex        # leave running in TERMINAL 1

# 3. Push backend keys to Convex (new terminal)
npm run sync:convex-env

# 4. Verify everything is set
npm run check:env

# 5. Start the app
npm run dev               # leave running in TERMINAL 2
```

Open **http://localhost:3000**, sign up, and you're in.

The rest of this doc explains each step and where to get every key.

---

## Step 1 — Prerequisites

| Need | Check | Get it |
|---|---|---|
| **Node.js 20.9+** | `node -v` | https://nodejs.org |
| **npm** | `npm -v` | comes with Node |
| Two terminal windows | — | Convex runs in one, Next.js in the other |

```bash
npm run setup
```

This installs dependencies, creates `.env.local` from the template, and prints a checklist. (It never overwrites an existing `.env.local`.)

---

## Step 2 — Create the accounts

| Service | Required? | What it does | Sign up |
|---|---|---|---|
| **Clerk** | ✅ | Sign‑in / sign‑up | https://clerk.com |
| **Convex** | ✅ | Database, backend functions, file storage | https://convex.dev |
| **OpenRouter** | ✅ | AI (matching, resume, chat) | https://openrouter.ai |
| **OpenWebNinja (JSearch)** | ✅ | Live job listings | https://www.openwebninja.com |
| **Clerk Billing** | ⬜ optional | Subscriptions / paywall (built into Clerk) | — |

> By default the app runs in **open dev mode** — every feature works after sign‑in, no paywall. (See [billing notes](#-billing-is-via-clerk-billing-and-enforced-on-the-server) before turning it on.)

---

## Step 3 — Fill in `.env.local`

Open `.env.local` (created by `npm run setup`) and fill these in. Below is exactly where each value comes from.

### 3a. Clerk

1. Create an application in the Clerk dashboard.
2. **API keys** (Clerk → *Configure → API keys*):
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   ```
3. **Connect Clerk to Convex** (this is the part people miss — and it's simpler than the old way):
   - In the Clerk Dashboard, enable the **Convex** integration. Clerk automatically maps the `convex` audience claim that Convex needs — **you do not hand-create a "convex" JWT template anymore.**
   - Copy your **Frontend API URL** (Clerk → *Configure → API keys* → "Frontend API URL"; it looks like `https://your-app.clerk.accounts.dev`) into:
     ```bash
     CLERK_FRONTEND_API_URL=https://your-app.clerk.accounts.dev
     ```
   > This is the value `convex/auth.config.ts` uses as the auth provider `domain`. It's a **backend** key — `npm run sync:convex-env` (Step 5) pushes it into your Convex deployment. Reference: [Clerk × Convex docs](https://clerk.com/docs/guides/development/integrations/databases/convex).
4. Leave the `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `SIGN_UP_URL` / `AFTER_*` lines as they are.

### 3b. OpenRouter

1. Create a key at https://openrouter.ai/keys (add a little credit to the account).
2. ```bash
   OPENROUTER_API_KEY=sk-or-v1-xxx
   OPENROUTER_MODEL=google/gemini-2.5-flash
   ```
   > **Update the model line** — the template still says `...-flash-preview`, but the app now defaults to the stable `google/gemini-2.5-flash`. Set it to the line above (or delete the line to use the default).

### 3c. OpenWebNinja (JSearch)

1. Create an account at [openwebninja.com](https://www.openwebninja.com) and subscribe to the **JSearch** API (free tier is fine).
2. Copy your API key into `.env.local`:
   ```bash
   JSEARCH_API_KEY=your_openwebninja_api_key
   # JSEARCH_BASE_URL is optional — defaults to https://api.openwebninja.com/jsearch
   ```

### 3d. Convex URLs — **leave blank for now**

`NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` are filled in **automatically** in the next step. Don't touch them.

### 3e. Billing — skip unless you want the paywall

Billing is handled by **Clerk Billing** (no Stripe keys in the app). Nothing to set here for dev. See [Step 7](#step-7--optional-turn-on-clerk-billing) when you want to turn the paywall on.

---

## Step 4 — Create your Convex backend

```bash
npx convex login          # opens the browser once
npm run dev:convex        # TERMINAL 1 — keep this running
```

On first run, Convex will prompt you to create a project. When it does, it:

- creates your dev deployment,
- **writes `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` into `.env.local` for you**,
- generates the backend types and deploys all functions + the database schema (including the new tables this app uses).

Keep this terminal running the whole time you develop — it hot‑reloads the backend.

---

## Step 5 — Push backend keys to Convex

Some keys are used **inside Convex functions** (not by the Next.js frontend), so they must live in your Convex deployment too. One command does it:

```bash
npm run sync:convex-env
```

This reads `.env.local` and pushes these into Convex: `CLERK_FRONTEND_API_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `JSEARCH_API_KEY`, `JSEARCH_BASE_URL`, and (only if set) `CLERK_BILLING_ENFORCED`, `CLERK_PAID_PLAN`, `MIGRATION_SECRET`. It skips anything still set to a placeholder.

If you still have `RAPIDAPI_KEY` from an older `.env.local`, the sync script **auto-maps** it to `JSEARCH_API_KEY`.

> Re‑run this any time you change a backend key. After syncing, make sure `npm run dev:convex` is running so `auth.config.ts` picks up the Clerk issuer.

---

## Step 6 — Verify, then run

```bash
npm run check:env         # green ✓ for the 6 required keys
```

Required keys it checks: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_FRONTEND_API_URL`, `NEXT_PUBLIC_CONVEX_URL`, `OPENROUTER_API_KEY`, `JSEARCH_API_KEY`.

Then start the frontend in your **second** terminal:

```bash
npm run dev               # TERMINAL 2
```

| Terminal | Command | What it is |
|---|---|---|
| 1 | `npm run dev:convex` | Convex backend (DB, functions, webhooks) |
| 2 | `npm run dev` | Next.js app at http://localhost:3000 |

Open **http://localhost:3000** → **Sign up** → you land on the dashboard.

---

## ⚠️ Billing is via Clerk Billing (and enforced on the server)

This app uses **Clerk Billing** (Clerk handles checkout via Stripe under the hood — no Stripe keys in the app). Plans live in the **Clerk Dashboard**. Access is enforced **server‑side** in Convex, not just the UI:

- **`CLERK_BILLING_ENFORCED` unset → everything is open** (normal local dev). ✅
- **`CLERK_BILLING_ENFORCED=true` in Convex → AI features require the paid plan.** Users without it get **"An active subscription is required."** on job search / resume analyze / optimize / chat. The Convex gate reads Clerk's `pla` claim off the session token.

For day‑to‑day dev, leave it off. The client paywall (`<PricingTable />`) is separately gated by `NEXT_PUBLIC_BILLING_ENFORCED`.

---

## Step 7 — (Optional) Turn on Clerk Billing

1. Enable billing on the instance (idempotent — already done if you ran setup):
   ```bash
   npx clerk@latest enable billing --for users
   ```
2. In the **Clerk Dashboard → Subscription Plans**, create a plan with slug **`pro`** (monthly + optional annual price, and at least one Feature). A different slug? set `NEXT_PUBLIC_CLERK_PAID_PLAN` and `CLERK_PAID_PLAN`.
3. Test: open `/paywall` → subscribe with Stripe test card `4242 4242 4242 4242`.
4. Turn enforcement on once it works:
   ```bash
   # .env.local (client)
   NEXT_PUBLIC_BILLING_ENFORCED=true
   # Convex (server)
   npx convex env set CLERK_BILLING_ENFORCED true
   npx convex env set CLERK_PAID_PLAN pro
   ```

> Dev uses Clerk's Stripe **sandbox**; production needs a **separate Stripe account** connected to your Clerk prod instance. Clerk Billing is USD‑only and processes refunds through Stripe, not Clerk.

---

## Verify it works (2‑minute smoke test)

| Step | Do this | Expect |
|---|---|---|
| Auth | Sign up | Lands on the dashboard with a "Get set up" checklist |
| Resume | `/resume` → drop a PDF | "Resume loaded — N characters" |
| Resume | Paste a job description + title → **Analyze match** | A real score + breakdown bars |
| Resume | **Generate optimized PDF** | Score delta + a downloadable PDF |
| Jobs | `/jobs` → search a title | Jobs stream in with match badges |
| Jobs | Tap the heart, then open **Saved** | The job is there |
| Jobs | **Ask AI** on a job | The coach replies; reopen → history is still there |
| Apps | Hit **Apply**, then open **Applications** | It's tracked as "applied" |
| Mobile | Shrink the window | Hamburger menu + slide‑over nav appear |

---

## Troubleshooting

**"Not authenticated" / Convex queries failing**
Clerk ↔ Convex mismatch. Confirm `CLERK_FRONTEND_API_URL` in `.env.local` is your Clerk **Frontend API URL** and that the **Convex integration is enabled** in the Clerk Dashboard. Run `npm run sync:convex-env`, then restart `npm run dev:convex` so `auth.config.ts` reloads.

**"An active subscription is required"**
You have `STRIPE_SECRET_KEY` set in Convex but no active subscription. Either subscribe via `/paywall`, or for local dev remove it: `npx convex env unset STRIPE_SECRET_KEY`.

**Convex URL missing / client can't connect**
Run `npm run dev:convex` once — it writes `NEXT_PUBLIC_CONVEX_URL` into `.env.local`. Then restart `npm run dev`.

**Job search returns nothing**
`JSEARCH_API_KEY` must be in **Convex**, not just `.env.local` → `npm run sync:convex-env`. If you only have `RAPIDAPI_KEY`, sync will map it automatically. Confirm your OpenWebNinja / JSearch API key is valid.

**Resume analyze / chat fails**
Check `OPENROUTER_API_KEY` is in Convex and the account has credit. Watch the Convex dashboard → *Logs* for the actual error (failures now surface instead of returning a fake score).

**"Rate limit reached"**
Per‑user hourly caps protect your API budget (job search 10/h, analyze 20/h, optimize 12/h, chat 60/h, upload 20/h). Wait, or adjust them in `convex/lib/limits.ts`.

**PDF upload rejected**
Resumes must be a **PDF under 10 MB**. Scanned/image‑only PDFs may extract no text — use a text‑based PDF.

---

## Command reference

| Command | What it does |
|---|---|
| `npm run setup` | Install deps + create `.env.local` |
| `npm run check:env` | Validate `.env.local` |
| `npm run sync:convex-env` | Push backend keys `.env.local` → Convex |
| `npm run dev:convex` | **Terminal 1** — Convex backend |
| `npm run dev` | **Terminal 2** — Next.js app |
| `npm run build` | Production build check |
| `npx convex login` | Authenticate the Convex CLI |
| `npx convex dashboard` | Open your Convex dashboard |
| `npx convex env list` | List env vars set on the deployment |
| `npx convex env unset <KEY>` | Remove an env var from the deployment |

---

## Deploying later (quick pointer)

- **Convex:** `npx convex deploy`, then set the same backend env vars on the **production** deployment and point the Stripe webhook at the production `.convex.site/stripe/webhook`.
- **Next.js (e.g. Vercel):** add all `NEXT_PUBLIC_*` vars + `CLERK_SECRET_KEY`, set `APP_URL` / `NEXT_PUBLIC_APP_URL` to your domain, and add that domain to Clerk's allowed origins. Run `npm run build` locally first to verify.

---

**Stuck?** Run `npm run check:env`, then check the Convex dashboard → *Logs*, then re‑read the matching troubleshooting row above. For a deeper look at the codebase and recent hardening, see **[AUDIT.md](./AUDIT.md)**.
