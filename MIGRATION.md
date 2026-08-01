# Migrating from Supabase → Clerk + Convex

End-to-end runbook to move **auth users, profiles, applications, and resumes** out of the old Supabase project (`wqyquvgduwjkyadkumkl`) into the new stack.

The join key across all three systems is **email**:

```
Supabase row ──email──▶ Clerk user (clerkId) ──clerkId──▶ Convex user row ──▶ profiles / applications / resumes
```

Everything is **idempotent** — every step can be re-run safely.

---

## What moves where

| Supabase | → | Destination |
|---|---|---|
| `auth.users` (accounts, passwords) | → | **Clerk** users |
| `profiles` | → | Convex `users` + `profiles` |
| `applications` | → | Convex `applications` |
| `resume_uploads` (text) | → | Convex `resumes` |
| Storage bucket (resume **PDFs**) | → | Convex file storage *(optional — see §6)* |

---

## 0. Install & authenticate the Supabase MCP

The MCP is already configured in [`.mcp.json`](.mcp.json). To authenticate (one time):

```bash
# In a regular terminal (not the IDE extension):
claude /mcp
# → select "supabase" → "Authenticate" → approve in the browser
```

Then **use the MCP to confirm the real schema before importing** — table and column names below are the script's best guess and the importer maps several common aliases, but verify:

> "List the tables in the public schema and show the columns of `profiles`, `applications`, and `resume_uploads`."

If column names differ from what `scripts/import-to-convex.ts` looks for (`pick([...])` arrays), add yours to those arrays.

---

## 1. Export from Supabase

Grab the project URL and a **secret key** — Supabase Dashboard → **Settings → API Keys → Secret keys** (`sb_secret_…`, the modern replacement for `service_role`; the legacy `service_role` JWT still works too). Use the **secret** key, not the publishable one — the export needs RLS-bypassing read access. Then:

```bash
SUPABASE_URL=https://wqyquvgduwjkyadkumkl.supabase.co \
SUPABASE_SECRET_KEY=sb_secret_... \
npm run migrate:export
# (legacy alternative: SUPABASE_SERVICE_ROLE_KEY=eyJ...)
```

Writes `scripts/export-<timestamp>.json` containing `authUsers`, `profiles`, `applications`, `resumes`. Note the path — every later step takes it as `EXPORT_FILE`.

---

## 2. Migrate auth (Supabase → Clerk)

You have two options. **Passwordless is simpler and works for everyone; password-preserving keeps existing passwords for email/password users.**

### Option A — passwordless (recommended, simplest)
Create the Clerk accounts now; users sign in via the **same OAuth provider** they used before (Clerk matches by verified email), or do a one-time **password reset** for email/password accounts. No hashes to handle.

```bash
CLERK_SECRET_KEY=sk_... \
EXPORT_FILE=scripts/export-<timestamp>.json \
npm run migrate:clerk
```

### Option B — preserve passwords (email/password users)
Supabase stores passwords as **bcrypt** in `auth.users.encrypted_password`, and Clerk can import bcrypt digests. The Admin API used in step 1 does **not** expose hashes, so pull them with the **Supabase MCP**:

> "Run this SQL and return the rows: `select id, email, encrypted_password from auth.users where encrypted_password is not null;`"

Then merge each `encrypted_password` into the matching `authUsers[].passwordHash` field of your `export-*.json` (match on `id`/`email`). Re-run `npm run migrate:clerk` — when `passwordHash` is present it's sent to Clerk as `passwordDigest` + `passwordHasher: "bcrypt"`, so the user keeps their password.

> The Clerk import **skips emails that already exist** and stores the original Supabase id in Clerk `externalId`.

---

## 3. Set the migration secret on Convex

The Convex import mutations ([`convex/migrations.ts`](convex/migrations.ts)) are guarded by a shared secret so they can't be called by anyone else. Set the **same** value in two places:

```bash
# 1) on the Convex deployment
npx convex env set MIGRATION_SECRET "$(openssl rand -hex 24)"
# (copy the value it sets, or set your own)

# 2) in your shell for step 4 (and optionally .env.local)
export MIGRATION_SECRET=<the same value>
```

Make sure your schema + functions are deployed (`npm run dev:convex` running, or `npx convex deploy`).

---

## 4. Import data into Convex

```bash
NEXT_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud \
CLERK_SECRET_KEY=sk_... \
MIGRATION_SECRET=<same value as step 3> \
EXPORT_FILE=scripts/export-<timestamp>.json \
npm run migrate:convex
```

What it does, in order, batched 50 at a time:
1. Lists Clerk users → builds an `email → clerkId` map.
2. `importUsers` — pre-creates Convex `users` rows (with the real `clerkId`) so data attaches before first login.
3. `importProfiles`, `importApplications`, `importResumes` — each resolved to a user by email; rows whose email has no Clerk/Convex user are skipped and counted.

When a migrated user later signs into Clerk, the app's `UserSync` finds the pre-created row by `clerkId` and updates it — so their data is already there.

---

## 5. Verify

- **Convex dashboard → Data:** spot-check `users`, `profiles`, `applications`, `resumes` counts against the export.
- **Sign in as a migrated user:** the dashboard should show their applications/saved data; `/profile` should be pre-filled; `/resume` should show their resume text.
- The import logs `applied/total` per table — investigate any large `skipped` (usually an email with no Clerk account, i.e. step 2 didn't create it).

---

## 6. Resume PDFs (storage) — optional

Resume **text** is migrated (it powers analysis/matching/chat). The original **PDF files** in Supabase Storage are not auto-moved. Two choices:

- **Easiest:** let users re-upload on the `/resume` page (the text is already there, so AI features work immediately regardless).
- **Full migration:** for each `resume_uploads` row, download the file from Supabase Storage (`supabase.storage.from(bucket).download(path)`), upload to Convex (`generateUploadUrl` → POST → `storageId`), and pass that `storageId` into `importResumes`. The `importResumes` mutation already accepts an optional `storageId`.

---

## 7. Clean up (important)

The import mutations are a temporary, privileged surface. When the migration is done:

```bash
rm convex/migrations.ts        # remove the import mutations
npx convex env remove MIGRATION_SECRET
npm run dev:convex             # redeploy without them
```

Also delete the `scripts/export-*.json` files (they contain PII) once you've confirmed the migration.

---

## Safety notes

- All imports are **idempotent** and **additive** — they never delete Supabase data. Keep Supabase running until you've verified the new stack.
- The importer only ever **upserts by email/clerkId**; it can't cross-attach one user's data to another.
- Run on a **staging** Convex deployment first if you want a dry run, then repeat against production.

---

## Command reference

| Step | Command |
|---|---|
| Export from Supabase | `npm run migrate:export` |
| Import users → Clerk | `npm run migrate:clerk` |
| Import data → Convex | `npm run migrate:convex` |
| Set Convex secret | `npx convex env set MIGRATION_SECRET …` |
| Inspect Supabase schema | Supabase MCP (`claude /mcp` to auth) |
