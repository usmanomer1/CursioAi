/**
 * Step 2 of the migration: import Supabase auth users into Clerk.
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_... EXPORT_FILE=scripts/export-<ts>.json \
 *   npx tsx scripts/import-users-to-clerk.ts
 *
 * - Idempotent: skips any email that already exists in Clerk.
 * - Preserves passwords when a bcrypt `passwordHash` is present on the export
 *   row; otherwise creates the user without a password (they sign in via the
 *   same OAuth provider, or reset their password once). See MIGRATION.md §Auth.
 * - Stores the original Supabase id in Clerk `externalId` for traceability.
 */

import { createClerkClient } from "@clerk/backend";
import { readFile } from "fs/promises";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const EXPORT_FILE = process.env.EXPORT_FILE;

if (!CLERK_SECRET_KEY) {
  console.error("Missing CLERK_SECRET_KEY");
  process.exit(1);
}
if (!EXPORT_FILE) {
  console.error("Missing EXPORT_FILE (path to the export-*.json from step 1)");
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

interface AuthUser {
  id?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  providers?: string[];
  passwordHash?: string; // optional bcrypt digest
}

function splitName(full?: string): { firstName?: string; lastName?: string } {
  if (!full) return {};
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const raw = await readFile(EXPORT_FILE!, "utf8");
  const data = JSON.parse(raw) as { authUsers?: AuthUser[] };
  const all = (data.authUsers ?? []).filter((u) => u.email);
  // TEST_EMAILS imports only specific addresses; LIMIT caps a leading batch.
  const testEmails = process.env.TEST_EMAILS
    ? new Set(
        process.env.TEST_EMAILS.split(",").map((e) => e.trim().toLowerCase())
      )
    : null;
  const limit = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : all.length;
  const users = testEmails
    ? all.filter((u) => testEmails.has((u.email ?? "").toLowerCase()))
    : all.slice(0, limit);

  console.log(
    `👤 Importing ${users.length}${
      limit < all.length ? ` of ${all.length} (test batch)` : ""
    } users into Clerk...\n`
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of users) {
    const email = u.email!.toLowerCase();
    try {
      const existing = await clerk.users.getUserList({ emailAddress: [email] });
      if (existing.data.length > 0) {
        skipped++;
        continue;
      }

      const { firstName, lastName } = splitName(u.full_name);
      const base = {
        emailAddress: [email],
        firstName,
        lastName,
        externalId: u.id,
        skipPasswordRequirement: !u.passwordHash,
      };
      const params = u.passwordHash
        ? { ...base, passwordDigest: u.passwordHash, passwordHasher: "bcrypt" as const }
        : base;

      const user = await clerk.users.createUser(params);
      // Mark the email verified so OAuth (Google) sign-ins auto-link to this
      // account and password users skip the verification step.
      const emailId = user.primaryEmailAddressId ?? user.emailAddresses[0]?.id;
      if (emailId) {
        await clerk.emailAddresses.updateEmailAddress(emailId, {
          verified: true,
        });
      }
      created++;
      if (created % 25 === 0) console.log(`  …${created} created`);
      await sleep(150); // stay under Clerk rate limits
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠️  ${email}: ${msg}`);
    }
  }

  console.log(
    `\n✅ Clerk import done — created ${created}, skipped ${skipped} (already existed), failed ${failed}`
  );
  console.log("Next: EXPORT_FILE=" + EXPORT_FILE + " npm run migrate:convex");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
