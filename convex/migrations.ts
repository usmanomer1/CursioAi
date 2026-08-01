import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * One-time Supabase → Convex import.
 *
 * These are PUBLIC mutations (so a Node script can call them with the
 * ConvexHttpClient) but gated by a shared secret. They are idempotent — safe
 * to re-run — and map every row to a user by email.
 *
 * SECURITY: set MIGRATION_SECRET in the Convex deployment before running, and
 * DELETE this file (or unset the secret) once the migration is complete.
 */

function assertSecret(secret: string) {
  const expected = process.env.MIGRATION_SECRET;
  if (!expected) {
    throw new Error(
      "MIGRATION_SECRET is not set on the Convex deployment. Set it before importing."
    );
  }
  if (secret !== expected) throw new Error("Invalid migration secret");
}

type AppStatus =
  | "saved"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn";

function normalizeStatus(raw?: string): AppStatus {
  const s = (raw ?? "").toLowerCase().trim();
  if (
    s === "saved" ||
    s === "applied" ||
    s === "interviewing" ||
    s === "offered" ||
    s === "rejected" ||
    s === "withdrawn"
  ) {
    return s;
  }
  // Map the legacy Supabase status vocabulary (SENT, OA, accepted, pending, …).
  if (s.includes("interview") || s === "oa" || s.includes("assessment"))
    return "interviewing";
  if (s.includes("offer") || s.includes("accept")) return "offered";
  if (s.includes("reject") || s.includes("decline")) return "rejected";
  if (s.includes("withdraw")) return "withdrawn";
  if (s === "sent" || s.includes("pending") || s.includes("appl"))
    return "applied";
  return "saved";
}

async function findUserByEmail(
  ctx: MutationCtx,
  email: string
): Promise<Id<"users"> | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
    .first();
  return user?._id ?? null;
}

/** Pre-create / update Convex user rows so imported data can attach before the
 * user has signed in. clerkId comes from the Clerk import step. */
export const importUsers = mutation({
  args: {
    secret: v.string(),
    users: v.array(
      v.object({
        clerkId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({ created: v.number(), updated: v.number() }),
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    let created = 0;
    let updated = 0;
    const now = Date.now();
    for (const u of args.users) {
      const email = u.email.toLowerCase();
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", u.clerkId))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          email,
          name: u.name ?? existing.name,
          avatarUrl: u.avatarUrl ?? existing.avatarUrl,
          updatedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("users", {
          clerkId: u.clerkId,
          email,
          name: u.name,
          avatarUrl: u.avatarUrl,
          onboardingComplete: false,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }
    return { created, updated };
  },
});

export const importProfiles = mutation({
  args: {
    secret: v.string(),
    profiles: v.array(
      v.object({
        email: v.string(),
        headline: v.optional(v.string()),
        bio: v.optional(v.string()),
        location: v.optional(v.string()),
        phone: v.optional(v.string()),
        linkedinUrl: v.optional(v.string()),
        githubUrl: v.optional(v.string()),
        websiteUrl: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({ imported: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    let imported = 0;
    let skipped = 0;
    const now = Date.now();
    for (const p of args.profiles) {
      const userId = await findUserByEmail(ctx, p.email);
      if (!userId) {
        skipped++;
        continue;
      }
      const fields = {
        headline: p.headline,
        bio: p.bio,
        location: p.location,
        phone: p.phone,
        linkedinUrl: p.linkedinUrl,
        githubUrl: p.githubUrl,
        websiteUrl: p.websiteUrl,
      };
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { ...fields, updatedAt: now });
      } else {
        await ctx.db.insert("profiles", {
          userId,
          ...fields,
          updatedAt: now,
        });
      }
      imported++;
    }
    return { imported, skipped };
  },
});

export const importApplications = mutation({
  args: {
    secret: v.string(),
    applications: v.array(
      v.object({
        email: v.string(),
        jobId: v.optional(v.string()),
        jobTitle: v.string(),
        companyName: v.string(),
        jobUrl: v.optional(v.string()),
        status: v.optional(v.string()),
        notes: v.optional(v.string()),
        createdAt: v.optional(v.number()),
      })
    ),
  },
  returns: v.object({ imported: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    let imported = 0;
    let skipped = 0;
    for (const a of args.applications) {
      const userId = await findUserByEmail(ctx, a.email);
      if (!userId) {
        skipped++;
        continue;
      }
      // Dedupe so re-runs don't create duplicates.
      const existingForUser = await ctx.db
        .query("applications")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const dupe = existingForUser.find(
        (x) =>
          x.jobTitle === a.jobTitle && x.companyName === a.companyName
      );
      if (dupe) {
        skipped++;
        continue;
      }
      const ts = a.createdAt ?? Date.now();
      const status = normalizeStatus(a.status);
      await ctx.db.insert("applications", {
        userId,
        jobId: a.jobId ?? `import_${ts}_${Math.abs(hashStr(a.jobTitle + a.companyName))}`,
        jobTitle: a.jobTitle,
        companyName: a.companyName,
        jobUrl: a.jobUrl,
        status,
        notes: a.notes,
        appliedAt: status === "applied" ? ts : undefined,
        createdAt: ts,
        updatedAt: ts,
      });
      imported++;
    }
    return { imported, skipped };
  },
});

export const importResumes = mutation({
  args: {
    secret: v.string(),
    resumes: v.array(
      v.object({
        email: v.string(),
        resumeText: v.string(),
        fileName: v.optional(v.string()),
        storageId: v.optional(v.id("_storage")),
      })
    ),
  },
  returns: v.object({ imported: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    let imported = 0;
    let skipped = 0;
    const now = Date.now();
    for (const r of args.resumes) {
      const userId = await findUserByEmail(ctx, r.email);
      if (!userId || r.resumeText.trim().length < 20) {
        skipped++;
        continue;
      }
      const existing = await ctx.db
        .query("resumes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("isPrimary"), true))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          resumeText: r.resumeText,
          fileName: r.fileName ?? existing.fileName,
          storageId: r.storageId ?? existing.storageId,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("resumes", {
          userId,
          resumeText: r.resumeText,
          fileName: r.fileName,
          storageId: r.storageId,
          isPrimary: true,
          updatedAt: now,
        });
      }
      imported++;
    }
    return { imported, skipped };
  },
});

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
