/**
 * Step 1 of the Supabase → Jobotic migration: EXPORT.
 *
 * Pulls auth users + app tables out of Supabase into a single JSON file that
 * the Clerk import (step 2) and Convex import (step 3) consume.
 *
 * Usage (use the new secret key, sb_secret_…; legacy service_role also works):
 *   SUPABASE_URL=https://wqyquvgduwjkyadkumkl.supabase.co \
 *   SUPABASE_SECRET_KEY=sb_secret_... \
 *   npx tsx scripts/migrate-from-supabase.ts
 *
 * Output: scripts/export-<timestamp>.json
 *
 * Notes:
 * - Auth users come from the Admin API (no password hashes). To preserve
 *   passwords, add a `passwordHash` (bcrypt) per user — see MIGRATION.md §Auth.
 * - App tables are exported with `select *` so nothing is lost; the import
 *   step maps columns. Confirm table/column names with the Supabase MCP first.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFile } from "fs/promises";

const SUPABASE_URL = process.env.SUPABASE_URL;
// Prefer the new secret key (sb_secret_…); fall back to the legacy service_role
// JWT. Both bypass RLS, which the full-table export requires.
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY (legacy: SUPABASE_SERVICE_ROLE_KEY)"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

type Row = Record<string, unknown>;

async function exportTable(table: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.warn(`  ⚠️  ${table}: ${error.message} (skipping)`);
    return [];
  }
  return (data as Row[]) ?? [];
}

async function exportAuthUsers(): Promise<Row[]> {
  const users: Row[] = [];
  let page = 1;
  // Admin API is paginated.
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      console.warn(`  ⚠️  auth users: ${error.message}`);
      break;
    }
    const batch = data.users ?? [];
    for (const u of batch) {
      users.push({
        id: u.id,
        email: u.email,
        full_name:
          (u.user_metadata?.full_name as string | undefined) ??
          (u.user_metadata?.name as string | undefined),
        avatar_url: u.user_metadata?.avatar_url as string | undefined,
        providers: (u.app_metadata?.providers as string[] | undefined) ?? [],
        created_at: u.created_at,
        // passwordHash: "<bcrypt>"  // optional — add via MCP SQL to preserve passwords
      });
    }
    if (batch.length < 200) break;
    page++;
  }
  return users;
}

async function main() {
  console.log("📤 Exporting from Supabase...\n");

  const authUsers = await exportAuthUsers();
  console.log(`  Auth users:     ${authUsers.length}`);

  const profiles = await exportTable("profiles");
  console.log(`  profiles:       ${profiles.length}`);

  const applications = await exportTable("applications");
  console.log(`  applications:   ${applications.length}`);

  const resumes = await exportTable("resume_uploads");
  console.log(`  resume_uploads: ${resumes.length}`);

  const exportData = {
    exportedAt: new Date().toISOString(),
    source: SUPABASE_URL,
    authUsers,
    profiles,
    applications,
    resumes,
  };

  const outputPath = `./scripts/export-${Date.now()}.json`;
  await writeFile(outputPath, JSON.stringify(exportData, null, 2));

  console.log(`\n✅ Exported to ${outputPath}`);
  console.log("\nNext:");
  console.log(`  1. EXPORT_FILE=${outputPath} npm run migrate:clerk`);
  console.log(`  2. EXPORT_FILE=${outputPath} npm run migrate:convex`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
