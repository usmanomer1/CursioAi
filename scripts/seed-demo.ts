/**
 * Populates a demo account with sample saved jobs + applications so a
 * portfolio visitor sees a live-looking dashboard.
 *
 * The account must have signed in at least once (so its Convex user row
 * exists).
 *
 * Usage:
 *   NEXT_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud \
 *   MIGRATION_SECRET=<same value set on the Convex deployment> \
 *   DEMO_EMAIL=demo@yourdomain.com \
 *   npx tsx scripts/seed-demo.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
const MIGRATION_SECRET = process.env.MIGRATION_SECRET;
const DEMO_EMAIL = process.env.DEMO_EMAIL;

for (const [key, val] of Object.entries({
  NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
  MIGRATION_SECRET,
  DEMO_EMAIL,
})) {
  if (!val) {
    console.error(`Missing ${key}`);
    process.exit(1);
  }
}

async function main() {
  const convex = new ConvexHttpClient(CONVEX_URL!);
  const result = (await convex.mutation(anyApi.seedDemo.seedDemoAccount, {
    secret: MIGRATION_SECRET,
    email: DEMO_EMAIL,
  })) as { savedJobs: number; applications: number };

  console.log(
    `✅ Seeded ${DEMO_EMAIL}: ${result.savedJobs} saved jobs, ${result.applications} applications`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
