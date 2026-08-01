# Jobotic — Unified Next.js Monorepo

AI-powered job search platform consolidating **jobotic-backend**, **joboticresumeprocessor**, and **UsmanAiApply** into a single Next.js + Convex + Clerk stack.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Auth | Clerk (+ Convex integration) |
| Backend | Convex (queries, mutations, actions) |
| AI | OpenRouter + Vercel AI SDK |
| Job Search | JSearch (OpenWebNinja) |
| Agent Chat | `@convex-dev/agent` per-job coaching |

**Excluded:** Browser automation / LinkedIn auto-apply (intentionally left out).

## Features

- **Smart Job Search** — JSearch API + AI resume matching (ported from jobotic-backend)
- **Resume Optimizer** — Analyze & optimize resumes against job descriptions (ported from Python service)
- **Per-Job AI Coach** — Agentic chat with full job + resume context loaded automatically
- **Applications Tracker** — Track saved/applied/interviewing jobs
- **Real-time** — Convex reactive queries throughout

## Quick Start

**Full guide:** see **[SETUP.md](./SETUP.md)** for step-by-step instructions, service setup, and what's left to build.

```bash
npm run setup          # install deps + create .env.local
# Edit .env.local — see SETUP.md §4
npx convex login
npm run sync:convex-env
npm run dev:convex     # terminal 1
npm run dev            # terminal 2
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
jobotic/
├── convex/                 # Convex backend (replaces Express + Python services)
│   ├── schema.ts           # Full data model
│   ├── actions.ts          # Job search, resume AI (OpenRouter)
│   ├── jobs.ts             # Job search sessions & interactions
│   ├── resume.ts           # Resume analyses & generations
│   ├── applications.ts     # Application tracking
│   ├── users.ts            # User sync from Clerk
│   ├── agents/             # @convex-dev/agent job coach
│   └── lib/                # JSearch client, AI scoring, OpenRouter
├── src/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # UI components
│   └── lib/                # Client utilities
└── scripts/
    ├── setup.sh            # First-time setup (npm run setup)
    ├── check-env.sh        # Validate .env.local (npm run check:env)
    ├── sync-convex-env.sh  # Push backend keys to Convex
    └── migrate-from-supabase.ts  # Export Supabase data
```

See **[SETUP.md](./SETUP.md)** for the full setup guide.

## Environment Variables

See `.env.example` for all required keys.

## Migrating from Supabase

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
npx tsx scripts/migrate-from-supabase.ts
```

This exports profiles, applications, and resume data to JSON. Users must exist in Clerk first (mapped by email).

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Next.js   │────▶│    Clerk    │────▶│    Convex    │
│   Frontend  │     │    Auth     │     │   Backend    │
└─────────────┘     └─────────────┘     └──────┬───────┘
                                               │
                    ┌──────────────────────────┼──────────────────┐
                    ▼                          ▼                  ▼
              JSearch API               OpenRouter AI        @convex-dev/agent
              (OpenWebNinja)            (Vercel AI SDK)      (Job Coach Chat)
```

## What Was Migrated

| Old Service | New Location |
|------------|--------------|
| jobotic-backend `/api/jobs/*` | `convex/actions.ts` + `convex/lib/jsearch/` |
| jobotic-backend AI matching | `convex/lib/ai/scoring.ts` + OpenRouter |
| joboticresumeprocessor analyze | `convex/actions.analyzeResume` |
| joboticresumeprocessor generate | `convex/actions.optimizeResume` |
| UsmanAiApply job search UI | `src/app/(dashboard)/jobs/` |
| UsmanAiApply resume UI | `src/app/(dashboard)/resume/` |
| UsmanAiApply Convex jobs | `convex/jobs.ts` (expanded schema) |
| Supabase auth | Clerk |
| Supabase data | Convex tables |

## License

Private — Jobotic
