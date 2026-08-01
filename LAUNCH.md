# Jobotic — Path to Launch

Where the project stands and exactly what's left. Everything below the line "What's left" is blocked only on **buying a domain**.

---

## ✅ Done

| Area | Status |
|---|---|
| **Auth** | Clerk, modern Convex integration (`CLERK_FRONTEND_API_URL`, no JWT template). Google + email. |
| **Backend** | Convex. Security audit applied: server-side gating, chat ownership checks, per-user SHA-256 cache keys, rate limits, upload validation. |
| **Job search** | JSearch via **OpenWebNinja** (`/search-v2`, `x-api-key`). |
| **Billing** | **Clerk Billing** (B2C). `<PricingTable />`, `has({ plan })` on the client, `pla` claim check server-side in Convex. All legacy Stripe code removed. |
| **UI/UX** | Full design-token system with **light + dark mode**, responsive shell w/ mobile nav, onboarding checklist, skeletons, empty states, markdown chat. |
| **Migration tooling** | Export → Clerk → Convex scripts, tested end-to-end on a real account. |
| **Build health** | `tsc` clean, `eslint` 0 errors, `next build` passes (12 routes). `proxy.ts` (Next 16 convention). |

**Migration rehearsal results:** 803 auth users, 838 profiles, 321 applications exported. 6 users + 6 profiles + 2 applications imported to dev and verified by signing in.

---

## What's left

### 1. Buy a domain (the only real blocker)
A Clerk **production** instance requires DNS on a domain you control. A free `*.vercel.app` subdomain will **not** work. Buying through Vercel (~$12/yr) is fine — it's a domain you control.

### 2. Stand up production
```bash
# a) Convex production (no domain needed)
npx convex deploy

# b) Push backend env to the prod deployment
#    CLERK_FRONTEND_API_URL (prod), OPENROUTER_API_KEY, JSEARCH_API_KEY, …
```
- **Clerk production instance**: add the DNS records Clerk gives you for `clerk.yourdomain.com`, and create your **own Google OAuth client** (Google Cloud Console) — prod can't use Clerk's shared dev credentials.
- **Vercel**: import the repo, add env vars (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` prod, `CLERK_SECRET_KEY` prod, `NEXT_PUBLIC_CONVEX_URL` prod, `NEXT_PUBLIC_CLERK_PAID_PLAN`), attach the domain.

### 3. Create the billing plan
Clerk Dashboard → **Subscription Plans** → plan with slug **`pro`**. Test checkout with card `4242 4242 4242 4242`.
Then enable enforcement:
```bash
# client
NEXT_PUBLIC_BILLING_ENFORCED=true
# server
npx convex env set CLERK_BILLING_ENFORCED true
npx convex env set CLERK_PAID_PLAN pro
```
> Production billing needs a **separate Stripe account** connected to the Clerk prod instance (dev uses Clerk's sandbox).

### 4. Run the real migration (into production)
Same scripts, prod keys. Nothing from the dev rehearsal carries over — Clerk dev and prod are fully separate.
```bash
SUPABASE_URL=… SUPABASE_SECRET_KEY=sb_secret_… npm run migrate:export
CLERK_SECRET_KEY=sk_live_… EXPORT_FILE=scripts/export-<ts>.json npm run migrate:clerk
NEXT_PUBLIC_CONVEX_URL=<prod> CLERK_SECRET_KEY=sk_live_… \
  MIGRATION_SECRET=… EXPORT_FILE=… npm run migrate:convex
```
Recommended: 5-user test batch (`LIMIT=5`) first, then the full run. See [MIGRATION.md](MIGRATION.md).

### 5. Post-launch cleanup
```bash
rm convex/migrations.ts
npx convex env remove MIGRATION_SECRET
rm scripts/export-*.json   # contains PII
```

---

## Known gaps (non-blocking)

| Item | Notes |
|---|---|
| **Resume PDFs not migrated** | `resume_uploads` in Supabase had no text column — only `file_url`. Users re-upload, or add a pass that downloads from Supabase Storage → Convex. |
| **194 email/password users** | Will do a one-time password reset (or magic code) unless you import bcrypt hashes. 595 Google users are unaffected. |
| **62 orphan applications** | Belong to deleted Supabase users; they skip on import. |
| **Terms / Privacy pages** | Routes are public in `proxy.ts` but the pages don't exist yet. |
| **Deferred audit items** | See [AUDIT.md](AUDIT.md) §5 — webhook ordering, `v.any()` tightening, `keyStrenghts` rename. |

---

## Theme system (for future work)

Semantic tokens are defined in `src/app/globals.css` and exposed as Tailwind utilities. **Use these, not raw `zinc-*`**, so both themes stay correct:

| Token | Use |
|---|---|
| `bg-canvas` | page background |
| `bg-surface` | cards, panels |
| `bg-raised` | hover states, inset areas |
| `border-line` / `border-line-strong` | borders |
| `text-fg` / `text-muted` / `text-subtle` | text hierarchy |
| `brand-400…600` | accent (violet) |

Theme is stored in `localStorage` (`jobotic-theme`), applied pre-paint by an inline script (no flash), and defaults to system preference. `dark:` variants work off `data-theme`.
