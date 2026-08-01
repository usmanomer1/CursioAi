# Deploying Cursio to production — cursio.ai

Step-by-step, in dependency order. Phases 1–3 can be done in one sitting (~1–2 hours, mostly waiting on DNS); billing and migration follow once auth works on the domain.

**You'll touch five dashboards:** your domain's DNS, Clerk, Google Cloud, Convex, Vercel.

> Where's the code? `github.com/usmanomer1/CursioAi` (main). Vercel deploys from this remote.

---

## Phase 0 — Prerequisites (have these open)

- [ ] cursio.ai purchased, and you can edit its DNS records
- [ ] GitHub repo pushed (done ✓)
- [ ] Clerk, Convex, Google Cloud, Vercel accounts
- [ ] Your OpenRouter + OpenWebNinja keys handy

---

## Phase 1 — Clerk production instance (start here: DNS takes time to propagate)

### 1.1 Create the instance
Clerk Dashboard → instance switcher (top bar, says **Development**) → **Create production instance**. Choose "clone development settings" so your Google/email auth config carries over as a starting point.

### 1.2 Set the domain
When asked for the domain enter **`cursio.ai`**. Clerk then shows a set of DNS records — add **all of them** at your DNS provider. They typically look like:

| Type | Name | Points to | Purpose |
|---|---|---|---|
| CNAME | `clerk` | `frontend-api.clerk.services` | Frontend API (`clerk.cursio.ai`) |
| CNAME | `accounts` | `accounts.clerk.services` | Hosted account pages |
| CNAME | `clkmail` | *(shown in dashboard)* | Email sending |
| CNAME | `clk._domainkey` + `clk2._domainkey` | *(shown in dashboard)* | DKIM |

> Use the **exact records the Clerk dashboard shows you** — the table above is just the shape. Clerk verifies them and issues SSL automatically (minutes to a few hours). You can continue with Phase 2/3 while this propagates.

### 1.3 Grab the production keys
Clerk (production instance) → **API keys**:
- `pk_live_…` publishable key
- `sk_live_…` secret key
- **Frontend API URL** → will be **`https://clerk.cursio.ai`** ← you'll need this for Convex

### 1.4 Enable the Convex integration on PROD
This is per-instance and **does not clone**. On the production instance, enable the **Convex** integration (same place you did for dev). Without it, Convex rejects every token — the "infinite spinner" failure.

### 1.5 Google OAuth — your own credentials (required in prod)
Prod cannot use Clerk's shared dev Google app. In [Google Cloud Console](https://console.cloud.google.com):

1. Create a project (e.g. "Cursio").
2. **APIs & Services → OAuth consent screen**: External → app name "Cursio", your support email, domain `cursio.ai` → publish.
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - **Authorized redirect URI**: copy the exact URI Clerk shows in *SSO Connections → Google → Use custom credentials* (looks like `https://clerk.cursio.ai/v1/oauth_callback`).
4. Copy the **Client ID + Client Secret** into that Clerk Google connection panel → save.

> 595 of the 803 migrated users sign in with Google — this step is what lets them in.

---

## Phase 2 — Convex production

### 2.1 Deploy the backend
```bash
npx convex deploy
```
Run from the repo root (your `CONVEX_DEPLOYMENT` targets the project's **prod** deployment for this command). Note the printed URL: `https://<name>.convex.cloud`.

### 2.2 Set prod env vars
```bash
npx convex env set --prod CLERK_FRONTEND_API_URL https://clerk.cursio.ai
npx convex env set --prod OPENROUTER_API_KEY   # paste value at the prompt (stays out of shell history)
npx convex env set --prod JSEARCH_API_KEY      # paste value at the prompt
npx convex env set --prod CLERK_BILLING_ENFORCED true
npx convex env set --prod CLERK_PAID_PLAN pro
# optional
npx convex env set --prod OPENROUTER_MODEL google/gemini-2.5-flash
```

> ⚠️ **#1 gotcha:** `CLERK_FRONTEND_API_URL` must be the **production** value (`https://clerk.cursio.ai`), *not* the dev `…clerk.accounts.dev` one. Wrong value → every request "Not authenticated".

---

## Phase 3 — Vercel

### 3.1 Import the repo
[vercel.com/new](https://vercel.com/new) → import **usmanomer1/CursioAi** (framework auto-detects Next.js).

### 3.2 Wire Convex into the build (recommended)
So every Vercel deploy also deploys the Convex backend and injects the right URL:

1. Convex Dashboard → your project → **prod deployment → Settings → Deploy keys** → generate a **production deploy key**.
2. In Vercel env vars add `CONVEX_DEPLOY_KEY` = that key.
3. Vercel → Project → **Settings → Build & Development** → Build Command:
   ```bash
   npx convex deploy --cmd 'npm run build'
   ```
   (`NEXT_PUBLIC_CONVEX_URL` is injected automatically during the build.)

*Simpler alternative:* skip the deploy key, keep the default build command, and set `NEXT_PUBLIC_CONVEX_URL` manually to the Phase 2.1 URL — but then you must remember `npx convex deploy` yourself whenever backend code changes.

### 3.3 Environment variables (Production)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |
| `CLERK_SECRET_KEY` | `sk_live_…` |
| `CONVEX_DEPLOY_KEY` | *(from 3.2, if using that route)* |
| `NEXT_PUBLIC_CONVEX_URL` | *(only if NOT using the deploy key route)* |
| `NEXT_PUBLIC_CLERK_PAID_PLAN` | `pro` |
| `NEXT_PUBLIC_BILLING_ENFORCED` | `true` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |

Secrets (`CLERK_SECRET_KEY`, `CONVEX_DEPLOY_KEY`) have no `NEXT_PUBLIC_` prefix and never reach the browser. The AI keys are **not** set here at all — they live only on Convex.

### 3.4 Attach the domain
Vercel → Project → **Settings → Domains** → add `cursio.ai` (+ `www.cursio.ai` → redirect to apex). If the domain was bought elsewhere, Vercel shows the A/CNAME records to add — these coexist fine with the Clerk CNAMEs from Phase 1.

### 3.5 Deploy & first smoke test
Trigger a deploy, then on **https://cursio.ai**:
- [ ] Landing page loads (light + dark toggle works)
- [ ] Sign **up** with a fresh email → lands on dashboard
- [ ] Sign in with **Google** → works (proves Phase 1.5)
- [ ] With billing enforced and no plan yet, AI features should say "subscription required" — correct for now

---

## Phase 4 — Billing (Clerk Billing, production)

1. Enable billing on the prod instance:
   ```bash
   npx clerk@latest enable billing --for users --instance prod
   ```
2. Clerk Dashboard (prod) → **Billing settings** → connect your **Stripe account** (production requires a real Stripe account — the dev sandbox doesn't carry over; if you don't have one, create it at stripe.com and complete activation).
3. **Subscription Plans** → create the plan with slug exactly **`pro`** (monthly + optional annual price).
4. Test the flow: `/paywall` shows the PricingTable → subscribe. This is **live mode** — use a real card and refund yourself in the Stripe dashboard, or comp your own account the plan (Users → you → assign `pro`) and verify AI features unlock.

---

## Phase 5 — Migrate the 803 users into prod

Prod Clerk is a **separate instance** — the dev rehearsal doesn't carry over. Same scripts, prod keys:

```bash
# 1. Fresh export (or reuse the latest scripts/export-*.json)
SUPABASE_URL=https://wqyquvgduwjkyadkumkl.supabase.co \
SUPABASE_SECRET_KEY=sb_secret_… npm run migrate:export

# 2. Test batch of 5 into PROD Clerk
CLERK_SECRET_KEY=sk_live_… LIMIT=5 \
EXPORT_FILE=scripts/export-<ts>.json npm run migrate:clerk

# 3. Set the migration secret on PROD Convex
npx convex env set --prod MIGRATION_SECRET "$(openssl rand -hex 24)"

# 4. Import data for those 5 (prod Convex URL + sk_live)
NEXT_PUBLIC_CONVEX_URL=https://<name>.convex.cloud \
CLERK_SECRET_KEY=sk_live_… MIGRATION_SECRET=<same> \
EXPORT_FILE=scripts/export-<ts>.json npm run migrate:convex

# 5. Sign in as yourself on cursio.ai (usmanokayani@gmail.com is in the export)
#    → profile prefilled + applications present? Then run the full set:
CLERK_SECRET_KEY=sk_live_… \
EXPORT_FILE=scripts/export-<ts>.json npm run migrate:clerk   # ~803, several minutes
# …then re-run step 4 (imports everyone)
```

Notes:
- Migrated users have **no subscription** → they'll see the paywall until they subscribe. Intended.
- Email/password users (194) reset their password once; Google users (595+14) just sign in.
- 62 orphaned applications (deleted users) skip automatically.

---

## Phase 6 — Cleanup (important)

```bash
npx convex env remove --prod MIGRATION_SECRET
git rm convex/migrations.ts convex/seedDemo.ts scripts/seed-demo.ts
git commit -m "Remove one-time migration and seed surface"
git push                      # Vercel redeploys, removing the functions from prod
rm -f scripts/export-*.json   # local PII
```

Also worth doing:
- [ ] Rotate the Supabase secret key (or pause the old project) once you've verified the migration
- [ ] Add `/terms` and `/privacy` pages (linked as public routes, don't exist yet)
- [ ] Convex Dashboard → prod → check logs after a day of traffic

---

## Final smoke test

| Flow | Expect |
|---|---|
| cursio.ai (logged out) | Landing page, theme toggle, sign in/up |
| Google sign-in (migrated user) | Lands on dashboard **with their old profile + applications** |
| Email user | "Forgot password" → reset → in, data present |
| New user + no plan | Redirected to `/paywall`; AI actions blocked server-side |
| Subscribed user | Job search returns scored jobs; analyze/optimize/chat work |
| Mobile | Hamburger nav, drawer, user menu |
| `/billing` | Shows current plan or PricingTable |

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Infinite spinner / "Not authenticated" everywhere | `CLERK_FRONTEND_API_URL` on prod Convex is wrong (still the dev URL), or the Convex integration isn't enabled on the **prod** Clerk instance |
| Google button errors | Custom OAuth credentials missing/wrong redirect URI (Phase 1.5) |
| Clerk domain stuck "unverified" | DNS records incomplete — recheck all CNAMEs, wait for propagation |
| "Subscription required" for a subscribed user | Plan slug ≠ `pro`, or `CLERK_PAID_PLAN`/`NEXT_PUBLIC_CLERK_PAID_PLAN` mismatch |
| Job search empty | `JSEARCH_API_KEY` missing on **prod** Convex (it goes there, not Vercel) |
| Migration import "Invalid secret" | `MIGRATION_SECRET` differs between your shell and prod Convex |
