# Jobotic — Audit & Improvement Report

_Full-stack audit of the Next.js 16 + Convex + Clerk + Stripe app, with the backend hardened and the UI substantially reworked in the same pass._

**Scope:** all of `convex/` (backend) and `src/` (frontend).
**Method:** a 6-dimension multi-agent audit (backend correctness, backend performance/cost, security/auth, UX flows, design system, code quality), each finding adversarially re-verified against the real code, then synthesized into one ranked list. 34 findings survived verification.
**Verification of the changes:** `npx tsc --noEmit` clean across `src/` + `convex/`, `npx eslint` clean (0 errors), and `npx convex codegen` regenerated the API types offline. The live backend and `next build` were **not** run here (per the project's "leave dev/deploy to the user" rule, and because Clerk/Stripe keys and network font fetching aren't available in this environment).

---

## 1. Executive summary

The codebase was well-structured but had a cluster of issues that fall into six themes:

1. **Server-side authorization was missing.** The expensive AI/JSearch actions only checked "is this request authenticated," never "is this user allowed / subscribed / the owner." The paywall was enforced **only** in client-side React. This was the single most important problem: any signed-in user could call the paid actions directly and burn OpenRouter/JSearch budget, read another user's coaching thread (which embeds their resume), or be served another user's optimized resume from a shared cache.
2. **Silent failure produced fabricated data.** A failed resume analysis was saved and returned as a real 50% "FAIR MATCH" score, indistinguishable from a genuine result.
3. **Core product loops dead-ended.** The Applications tracker had no way to ever add an application, saved jobs had no page to revisit them, chat history vanished on reopen, and the rich search filters that exist in the backend were never exposed.
4. **Mobile and account UX were absent.** No mobile navigation at all, no sign-out anywhere, no active-route highlight, no onboarding.
5. **Cost controls were thin.** Only the cheap job-search mutation was rate-limited; AI batches ran sequentially; a PDF was re-rendered and re-stored even on cache hits; every search wrote up to 100 rows to a table nothing reads.
6. **Type-safety / duplication / dead code.** `v.any()` on structurally-known columns (which is how a `keyStrenghts` typo went unnoticed), duplicated validators, an aliased re-export, and a dead streaming action.

This pass fixes the great majority of these (see §3), introduces a real design system and responsive shell (see §4), and documents what was intentionally deferred and why (see §5).

---

## 2. Severity snapshot

| Theme | Highest severity | Status after this pass |
|---|---|---|
| Server-side authorization & billing | **Critical** | Fixed |
| Silent failure / fabricated data | High | Fixed |
| Broken / unreachable product loops | **Critical** (UX) | Fixed |
| Mobile & account UX | High | Fixed |
| Cost control, rate limiting, write amplification | High | Fixed (chat-context trim deferred) |
| Billing webhook robustness | Medium | Idempotency + user-verify fixed; strict ordering deferred |
| Type-safety, duplication, dead code | Medium | Mostly fixed (persisted `v.any()` deferred) |

---

## 3. What was fixed

### 3.1 Security & billing

| # | Issue | Fix | Key files |
|---|---|---|---|
| 1 | **Paid AI actions had no server-side subscription gate** — paywall was client-only, so any authenticated user could call `searchAndMatchJobs` / `analyzeResume` / `optimizeResume` / chat directly. | New `internal.gating.assertCanUseAi` runs at the top of every paid action. It enforces an active subscription **when billing is configured** (Stripe secret present) and always applies a per-user rate limit. Open "dev mode" is preserved when Stripe is not configured. | `convex/gating.ts`, `convex/lib/limits.ts`, `convex/actions.ts`, `convex/resumeActions.ts`, `convex/agents/actions.ts` |
| 2 | **Job-chat IDOR** — `sendJobChatMessage` continued any client-supplied `threadId` with no ownership check, exposing another user's conversation (which embeds their resume + the job description). | Resolve the thread via the `by_agent_thread` index and assert `thread.userId === user._id` before continuing. The dead, weaker `streamJobChatMessage` was deleted. | `convex/agents/actions.ts`, `convex/jobChatInternal.ts` |
| 3 | **Cross-user resume leak via the optimization cache** — the cache key had no `userId` and used a collision-prone 32-bit hash, so one user could be served another's optimized resume/PDF. | Cache key now includes `userId` and is a SHA-256 hex digest (`node:crypto`). | `convex/resumeActions.ts` |
| 10 | **No rate limiting on AI actions; uploads unconstrained.** | Added per-feature limits (analyze 20/h, optimize 12/h, chat 60/h, upload 20/h) via a shared `RateLimiter`. `generateUploadUrl` is rate-limited, and `saveUploadedResume` validates content-type (PDF) and size (≤10 MB) via storage metadata, deleting rejects. | `convex/lib/limits.ts`, `convex/gating.ts`, `convex/resumeStorage.ts` |
| 13 | **Stripe webhook had no idempotency** (Stripe retries at-least-once) and cast `metadata.userId` unchecked. | Added a `processedStripeEvents` ledger — duplicate event IDs short-circuit with `200`. The checkout branch now verifies the user exists before writing, avoiding orphaned subscriptions. | `convex/http.ts`, `convex/billingInternal.ts` |
| 19 | **Billing reads used `.unique()`** and would throw for all billing if a user ever had two subscription rows. | Switched to `.first()`. | `convex/billing.ts` |

### 3.2 Correctness & data integrity

| # | Issue | Fix | Key files |
|---|---|---|---|
| 5 | **`analyzeResume` saved & returned a fabricated 50% score** on any failure. | The fallback-on-catch was removed; failures now propagate so the UI shows a real error toast instead of a fake "FAIR MATCH". | `convex/resumeActions.ts`, `src/app/(dashboard)/resume/page.tsx` |
| 4 | **New-user race** — `getCurrentUser` threw "User not found" until the client-side `UserSync` created the row, breaking every query (and stranding new users on a spinner). | Read queries now use `getOptionalUser` and return neutral values (`getMe → {user:null}`, lists → `[]`, `hasActiveSubscription → false`). `UserSync` moved into the dashboard layout, and `SubscriptionGuard` waits for the user to be provisioned before judging subscription state. | `convex/users.ts`, `convex/billing.ts`, `convex/applications.ts`, `convex/resume.ts`, `convex/jobs.ts`, `convex/jobChat.ts`, `src/components/subscription-guard.tsx`, `src/app/(dashboard)/layout.tsx` |
| 17 | **Dangling `storageId`** — pasting resume text left the row pointing at a now-mismatched uploaded PDF. | `saveResumeText` clears (and deletes) the stale blob when text replaces an uploaded file. | `convex/users.ts` |
| 24 | **`MatchBadge` hid a real 0% score** (`if (!score)`), making a 0 look un-scored. | Guard on presence (`score === undefined`); a genuine 0 now renders. | `src/components/match-badge.tsx` |

### 3.3 Performance & cost

| # | Issue | Fix | Key files |
|---|---|---|---|
| 6 | **Sequential AI matching** — batches of 5 ran one-after-another, so a 20-job search was 4 serial LLM round-trips (~12–24s held open). | Batches now run concurrently with `Promise.all`; wall-clock drops from O(batches) to ~O(1). Failed batches resolve to empty instead of stalling. | `convex/actions.ts` |
| 15 | **Write amplification** — every search wrote up to 100 rows (full descriptions) to a `jobs` table nothing reads. | Removed the `insertJobBatch` write path (results are returned directly and saved on demand via `userJobInteractions`). `processedCount` now reflects how many jobs were actually AI-scored. | `convex/actions.ts`, `convex/jobs.ts` |
| 10 | **PDF re-generated & re-stored on cache hits.** | On a cache hit, `optimizeResume` reuses the prior generation's stored PDF (new `by_analysis` index + `getLatestGenerationForAnalysis`) instead of rendering and storing a new blob. | `convex/resumeActions.ts`, `convex/resumeInternal.ts`, `convex/schema.ts` |
| 16 | **Unbounded `.collect()`** on liked jobs / chat threads / applications. | Capped with `.take()` (liked 100, threads 100, applications 200) and ordered. | `convex/jobs.ts`, `convex/jobChat.ts`, `convex/applications.ts` |
| 25 | **`DEFAULT_MODEL` duplicated and pinned to a stale `-preview` slug.** | Single source in `convex/lib/ai/models.ts`, imported by both call sites; default moved to the GA `google/gemini-2.5-flash` (env override preserved). | `convex/lib/ai/models.ts`, `convex/lib/ai/openrouter.ts`, `convex/agents/jobAdvisor.ts` |

### 3.4 UX & product flows

| # | Issue | Fix | Key files |
|---|---|---|---|
| 7 | **Applications tracker was a dead end** — nothing ever created an application. | "Apply" now records an `applied` application (deduped against existing) before opening the listing, from both the job detail and the new Saved page. A manual **Add application** form was added, plus a status summary. | `src/app/(dashboard)/jobs/page.tsx`, `src/app/(dashboard)/saved/page.tsx`, `src/app/(dashboard)/applications/page.tsx` |
| 8 | **No mobile navigation** (sidebar was `hidden md:flex`). | New `DashboardShell` with a desktop sidebar **and** a mobile top bar + slide-over drawer sharing one `navItems` list. | `src/components/dashboard-shell.tsx` |
| 9 | **No sign-out / account menu anywhere.** | Clerk `<UserButton/>` (avatar + name + email) in the sidebar footer and mobile bar; sign-out redirect configured on `ClerkProvider`. | `src/components/dashboard-shell.tsx`, `src/app/layout.tsx` |
| 11 | **Saved jobs were unreachable** (only a dashboard count). | New `/saved` route + nav entry listing liked jobs with Apply / Ask-AI / unsave; the dashboard stat links to it. | `src/app/(dashboard)/saved/page.tsx` |
| 12 | **Rich search filters were never exposed.** | Jobs page now has Date-posted, Remote-only, Employment-type, and Experience-level controls wired end-to-end. | `src/app/(dashboard)/jobs/page.tsx` |
| 20 | **Chat lost all history on reopen.** | New display-only `jobChatMessages` table + `jobChat.listMessages`; the panel rehydrates prior turns (and shows suggested prompts only for new threads). | `convex/schema.ts`, `convex/jobChat.ts`, `convex/jobChatInternal.ts`, `convex/agents/actions.ts`, `src/components/job-chat-panel.tsx` |
| 21 | **No onboarding / first-run guidance; bare spinners.** | Dashboard shows a 3-step "Get set up" checklist (resume → profile → first search) until complete, and pages use skeletons. | `src/app/(dashboard)/dashboard/page.tsx`, `src/components/ui/skeleton.tsx` |
| 22 | **Sidebar never highlighted the active route.** | Active state via `usePathname` in the client shell. | `src/components/dashboard-shell.tsx` |
| 23 | **Success page force-redirected after 5s**, risking a paywall bounce. | Removed the forced timer; the user navigates via the CTA. The paywall also redirects already-subscribed users to the dashboard. | `src/app/success/success-content.tsx`, `src/app/paywall/page.tsx` |

### 3.5 Design system

The app shipped with `globals.css` still set to the Create-Next-App boilerplate (light theme, Arial), while the layout forced a dark theme — so the Geist font wasn't even applied and the accent color drifted between amber/emerald/blue.

- **`globals.css` rewritten** as a coherent dark-first system: a `brand` (violet) scale, semantic surface tokens, the Geist font actually applied to `body`, accessible `:focus-visible` rings, refined scrollbars, selection color, a few keyframe animations, and a reduced-motion guard.
- **Reusable primitives** added under `src/components/ui/`: `Button` (cva variants incl. loading), `Card`, `Badge`, `Input`/`Textarea`/`Select`/`Label`, `Skeleton`, `EmptyState`, `Spinner`. Plus a shared `Logo`, `MatchBadge`/`MatchRing`, and job formatting helpers (`jobLocation`, `formatPosted`, `formatSalary`).
- Every page was reworked to use these, so spacing, color, and focus behavior are now consistent. Accent color is unified on **violet (brand) for primary/links**, **emerald for success/positive**, **amber for warnings**, **red for destructive/missing**.

### 3.6 Code quality

| # | Issue | Fix |
|---|---|---|
| 28 | Duplicated `cachedJobData` / `jobContext` validators across schema + handlers. | Centralized in `convex/lib/validators.ts`, imported everywhere. |
| 29 | `streamJobChatMessage` was dead code with a broken `streamText` stub. | Deleted. |
| 31 | `scoringResultSchemaExport` aliased re-export. | Export `scoringResultSchema` directly. |
| 32 | `resumeAnalyses.sections` declared but never written/read. | Removed from schema + getter. |
| 34 | `--turbopack` flag redundant in Next 16. | `dev` script simplified to `next dev`. |

---

## 4. New backend surface (additive — no destructive migrations)

All schema changes are **additive** so they can be pushed onto an existing deployment without breaking validation of existing documents:

- **New tables:** `jobChatMessages` (chat history), `processedStripeEvents` (webhook idempotency).
- **New index:** `resumeGenerations.by_analysis`.
- **Removed:** the never-written `resumeAnalyses.sections` field (safe — no document ever had it).
- **New modules:** `convex/gating.ts`, `convex/lib/limits.ts`, `convex/lib/validators.ts`, `convex/lib/ai/models.ts`.

> The `convex/_generated/` types were regenerated with `npx convex codegen` (offline; does not touch the running deployment). When you next run `npm run dev:convex`, the schema additions and new functions deploy normally.

---

## 5. Recommended next (intentionally deferred)

These were verified as real but deferred this pass, with rationale. They're the natural next backlog.

| # | Finding | Why deferred / how to do it |
|---|---|---|
| 13 | **Strict webhook ordering** (a late `updated` overwriting a `deleted`). | Idempotency + user-verify shipped; full ordering needs a stored event timestamp compared on each upsert. Add `eventCreated` to `subscriptions` and skip stale writes. |
| 14 | **AI batch failures are swallowed.** | `processedCount < totalFound` now signals partial scoring, but the caught error still isn't logged or surfaced as a UI warning. Add `console.error` + a "partial results" banner. |
| 26 | **Chat replays unbounded context each turn.** | `@convex-dev/agent`'s context options (`recentMessages`, etc.) weren't tuned because the exact API couldn't be validated without running the agent. Set bounded `contextOptions` on the agent once verifiable. |
| 27 | **`v.any()` on persisted columns** (`jobData`, `filters`, `structuredResume`). | Tightening a persisted column's validator can fail a schema push against existing documents, so this was left for a deliberate migration. Define concrete validators and backfill. |
| 30 | **`jobs.keyStrenghts` typo.** | The write path was removed (so it's now inert), but renaming the column would fail validation against existing rows. Fix in a migration that rewrites/drops the column. |
| 33 | **Some public queries lack `returns` validators.** | Low-risk consistency item; add validators reusing the shared table validators. |
| — | **Provision users server-side** (Clerk webhook or lazy `ensureUser`) to remove the sync race entirely, rather than only tolerating it. | |
| — | **Per-tier usage limits** tied to subscription (usage is tracked in `usageRecords` but not enforced as quotas). | |
| — | **Terms & Privacy pages** (`/terms`, `/privacy` are public-route matched but the pages don't exist). | |

---

## 6. Operational notes

- **Subscription enforcement toggle:** server-side gating activates automatically when `STRIPE_SECRET_KEY` is present in the Convex deployment. With no Stripe configured, the app stays open ("dev mode"), matching the existing client behavior. Make sure the Stripe secret is set in Convex (`npm run sync:convex-env`) before relying on the gate in production.
- **Rate limits** are per-user, per-hour: job search 10, resume analyze 20, optimize 12, chat 60, upload 20. Tune in `convex/lib/limits.ts`.
- **lucide-react** is pinned at `^1.21.0` (a valid published major in this project); the deprecated brand glyphs `Github`/`Linkedin` aren't exported, so the profile links use `AtSign`/`Link2`. No action needed unless you want true brand icons (use a dedicated icon set).

---

## 7. Verification performed

- `npx tsc --noEmit` — **clean** across `src/` and `convex/`.
- `npx eslint src convex` — **0 errors** (5 pre-existing warnings in generated files / Convex's anonymous-default convention).
- `npx convex codegen` — regenerated `_generated/` offline; new functions resolve, removed functions are gone.
- Not run here: the live Convex backend, and `next build` (needs Clerk/Stripe keys + network font fetch not available in this environment; the project also defers running dev to the user). Recommend a `npm run build` and a manual smoke test of the §6 flows before deploy.

---

## Appendix — full ranked findings

Ranked by impact-to-effort from the verified audit. "Status" reflects this pass.

| Rank | Severity | Finding | Status |
|---|---|---|---|
| 1 | Critical | Paid AI actions have no server-side subscription gate | Fixed |
| 2 | High | Job-chat actions accept any `threadId` (IDOR) | Fixed |
| 3 | High | `optimizationCache` global + weak hash (cross-user PII) | Fixed |
| 4 | High | `getCurrentUser` throws for brand-new users | Fixed |
| 5 | High | `analyzeResume` persists a fabricated 50% score | Fixed |
| 6 | High | AI matching batches run sequentially | Fixed |
| 7 | Critical (UX) | Applications tracker has no create path | Fixed |
| 8 | High | No mobile navigation | Fixed |
| 9 | High | No sign-out / account menu | Fixed |
| 10 | High | No AI rate limiting; PDF re-stored on cache hit; uploads unconstrained | Fixed |
| 11 | High | Saved jobs unreachable | Fixed |
| 12 | High | Search filters never exposed | Fixed |
| 13 | Medium | Stripe webhook idempotency/ordering | Idempotency fixed; ordering deferred |
| 14 | Medium | AI batch failures swallowed silently | Partial (count signal) |
| 15 | Medium | `insertJobBatch` write amplification | Fixed |
| 16 | Medium | Unbounded `.collect()` | Fixed |
| 17 | Medium | `saveResumeText` dangling `storageId` | Fixed |
| 18 | Medium | `generateUploadUrl` unconstrained | Fixed |
| 19 | Medium | `subscriptions` `.unique()` throws on dupes | Fixed |
| 20 | Medium | Chat loses history on reopen | Fixed |
| 21 | Medium | No onboarding / thin empty states | Fixed |
| 22 | Medium | Sidebar never highlights active route | Fixed |
| 23 | Medium | Success page force-redirects | Fixed |
| 24 | Medium | `MatchBadge` hides a real 0% | Fixed |
| 25 | Medium | `DEFAULT_MODEL` stale `-preview` + duplicated | Fixed |
| 26 | Medium | Chat replays unbounded context | Deferred |
| 27 | Medium | `v.any()` on known columns | Deferred (migration) |
| 28 | Medium | Duplicated validators | Fixed |
| 29 | Medium | `streamJobChatMessage` dead code | Fixed (deleted) |
| 30 | Low | `keyStrenghts` typo | Write removed; rename deferred (migration) |
| 31 | Low | `scoringResultSchemaExport` alias | Fixed |
| 32 | Low | `resumeAnalyses.sections` unused | Fixed (removed) |
| 33 | Low | Queries missing `returns` validators | Deferred |
| 34 | Low | `lucide-react` pin / `--turbopack` flag | `--turbopack` removed; pin noted |
