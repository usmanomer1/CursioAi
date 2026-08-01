/**
 * Step 3 of the migration: import the exported data into Convex.
 *
 * Usage:
 *   NEXT_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud \
 *   CLERK_SECRET_KEY=sk_... \
 *   MIGRATION_SECRET=<same value set on the Convex deployment> \
 *   EXPORT_FILE=scripts/export-<ts>.json \
 *   npx tsx scripts/import-to-convex.ts
 *
 * Resolves every row to a user by email:
 *   Supabase row → email → Clerk user (clerkId) → Convex user row.
 * Idempotent — safe to re-run. Run AFTER the Clerk import (step 2).
 */

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { createClerkClient } from "@clerk/backend";
import { readFile } from "fs/promises";

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const MIGRATION_SECRET = process.env.MIGRATION_SECRET;
const EXPORT_FILE = process.env.EXPORT_FILE;

for (const [k, val] of Object.entries({
  NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
  CLERK_SECRET_KEY,
  MIGRATION_SECRET,
  EXPORT_FILE,
})) {
  if (!val) {
    console.error(`Missing ${k}`);
    process.exit(1);
  }
}

const convex = new ConvexHttpClient(CONVEX_URL!);
const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY! });

type Row = Record<string, unknown>;

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}
function pick(row: Row, keys: string[]): string | undefined {
  for (const k of keys) {
    const val = str(row[k]);
    if (val) return val;
  }
  return undefined;
}
function toMs(v: unknown): number | undefined {
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
  }
  return undefined;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function buildEmailToClerkId(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let offset = 0;
  const limit = 100;
  for (;;) {
    const res = await clerk.users.getUserList({ limit, offset });
    for (const u of res.data) {
      const email = u.emailAddresses[0]?.emailAddress?.toLowerCase();
      if (email) map.set(email, u.id);
    }
    if (res.data.length < limit) break;
    offset += res.data.length;
  }
  return map;
}

async function runBatches(
  label: string,
  fn: typeof anyApi.migrations.importUsers,
  key: string,
  items: unknown[]
) {
  let imported = 0;
  for (const batch of chunk(items, 50)) {
    const res = (await convex.mutation(fn, {
      secret: MIGRATION_SECRET,
      [key]: batch,
    })) as { created?: number; updated?: number; imported?: number; skipped?: number };
    imported += res.imported ?? (res.created ?? 0) + (res.updated ?? 0);
  }
  console.log(`  ${label}: ${imported}/${items.length} applied`);
}

async function main() {
  const data = JSON.parse(await readFile(EXPORT_FILE!, "utf8")) as {
    authUsers?: Row[];
    profiles?: Row[];
    applications?: Row[];
    resumes?: Row[];
  };

  console.log("🔗 Resolving Clerk users by email…");
  const emailToClerk = await buildEmailToClerkId();
  console.log(`  ${emailToClerk.size} Clerk users found\n`);

  const authUsers = data.authUsers ?? [];
  const idToEmail = new Map<string, string>();
  for (const u of authUsers) {
    const id = str(u.id);
    const email = str(u.email)?.toLowerCase();
    if (id && email) idToEmail.set(id, email);
  }
  // profiles can also carry id↔email
  for (const p of data.profiles ?? []) {
    const id = str(p.id) ?? str(p.user_id);
    const email = str(p.email)?.toLowerCase();
    if (id && email && !idToEmail.has(id)) idToEmail.set(id, email);
  }

  const resolveEmail = (row: Row): string | undefined => {
    const direct = str(row.email)?.toLowerCase();
    if (direct) return direct;
    const id = str(row.user_id) ?? str(row.id);
    return id ? idToEmail.get(id) : undefined;
  };

  console.log("📥 Importing into Convex…");

  // Users (only those that made it into Clerk)
  const usersPayload = authUsers
    .map((u) => {
      const email = str(u.email)?.toLowerCase();
      const clerkId = email ? emailToClerk.get(email) : undefined;
      if (!email || !clerkId) return null;
      return {
        clerkId,
        email,
        name: str(u.full_name),
        avatarUrl: str(u.avatar_url),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  await runBatches("users", anyApi.migrations.importUsers, "users", usersPayload);

  // Profiles
  const profilesPayload = (data.profiles ?? [])
    .map((p) => {
      const email = resolveEmail(p);
      if (!email) return null;
      return {
        email,
        headline: pick(p, [
          "headline",
          "current_job_title",
          "title",
          "current_role",
        ]),
        bio: pick(p, ["bio", "about", "summary"]),
        location: pick(p, ["location", "city"]),
        phone: pick(p, ["phone", "phone_number"]),
        linkedinUrl: pick(p, ["linkedin_url", "linkedin"]),
        githubUrl: pick(p, ["github_url", "github"]),
        websiteUrl: pick(p, ["website_url", "website", "portfolio_url"]),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  await runBatches("profiles", anyApi.migrations.importProfiles, "profiles", profilesPayload);

  // Applications
  const appsPayload = (data.applications ?? [])
    .map((a) => {
      const email = resolveEmail(a);
      const jobTitle = pick(a, ["job_title", "title", "position"]);
      const companyName = pick(a, ["company_name", "company", "employer"]);
      if (!email || !jobTitle || !companyName) return null;
      return {
        email,
        jobId: pick(a, ["job_id", "id"]),
        jobTitle,
        companyName,
        jobUrl: pick(a, ["job_url", "url", "apply_link"]),
        status: pick(a, ["status", "stage"]),
        notes: pick(a, ["notes", "note"]),
        createdAt: toMs(a.created_at),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  await runBatches(
    "applications",
    anyApi.migrations.importApplications,
    "applications",
    appsPayload
  );

  // Resumes (text only — PDFs are handled separately, see MIGRATION.md §Storage)
  const resumesPayload = (data.resumes ?? [])
    .map((r) => {
      const email = resolveEmail(r);
      const resumeText = pick(r, [
        "resume_text",
        "extracted_text",
        "text",
        "content",
        "parsed_text",
      ]);
      if (!email || !resumeText) return null;
      return {
        email,
        resumeText,
        fileName: pick(r, ["file_name", "filename", "name"]),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  await runBatches("resumes", anyApi.migrations.importResumes, "resumes", resumesPayload);

  console.log("\n✅ Convex import complete.");
  console.log(
    "Reminder: remove convex/migrations.ts (or unset MIGRATION_SECRET) when done."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
