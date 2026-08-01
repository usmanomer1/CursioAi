import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Seeds a demo account with realistic saved jobs + applications so a portfolio
 * visitor lands on a populated dashboard instead of an empty one.
 *
 * Gated by the same MIGRATION_SECRET as the import mutations. Idempotent —
 * re-running replaces the seeded rows rather than duplicating them.
 *
 * DELETE this file (and unset MIGRATION_SECRET) once the demo is set up.
 */

const SEED_PREFIX = "demo_";

const SAVED_JOBS = [
  {
    jobId: `${SEED_PREFIX}sr_frontend`,
    job_title: "Senior Frontend Engineer",
    employer_name: "Linear",
    job_city: "San Francisco",
    job_state: "CA",
    job_is_remote: true,
    match_score: 92,
    match_label: "STRONG MATCH",
    match_reasons: [
      "5+ years of React and TypeScript directly matches the core stack",
      "Design-systems experience aligns with their component library work",
      "Prior startup experience fits a small, high-ownership team",
    ],
    missing_skills: ["Rust"],
    key_strengths: ["React/TypeScript depth", "Design systems", "Performance work"],
    job_description:
      "We're looking for a Senior Frontend Engineer to help build the fastest project management tool on the web. You'll own major surfaces of the product, from the editor to real-time sync. Stack: TypeScript, React, GraphQL.",
  },
  {
    jobId: `${SEED_PREFIX}fullstack`,
    job_title: "Full Stack Engineer",
    employer_name: "Vercel",
    job_city: "Remote",
    job_is_remote: true,
    match_score: 84,
    match_label: "GOOD MATCH",
    match_reasons: [
      "Next.js experience is exactly the product surface",
      "Comfortable across frontend and backend as the role requires",
    ],
    missing_skills: ["Go", "Kubernetes"],
    key_strengths: ["Next.js", "Full-stack delivery"],
    job_description:
      "Join the team building the platform for the modern web. You'll work across our dashboard, APIs, and build infrastructure. Experience with Next.js, React, and Node.js required.",
  },
  {
    jobId: `${SEED_PREFIX}product_eng`,
    job_title: "Product Engineer",
    employer_name: "Notion",
    job_city: "New York",
    job_state: "NY",
    job_is_remote: false,
    match_score: 67,
    match_label: "FAIR MATCH",
    match_reasons: [
      "Strong product sense from prior startup work",
      "Frontend skills transfer, though the role leans more backend",
    ],
    missing_skills: ["Elixir", "Distributed systems", "GraphQL federation"],
    key_strengths: ["Product thinking", "Rapid prototyping"],
    job_description:
      "Product Engineers at Notion own features end to end — from design review through launch and iteration. You'll work closely with design and product.",
  },
];

const APPLICATIONS: Array<{
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobUrl?: string;
  status:
    | "saved"
    | "applied"
    | "interviewing"
    | "offered"
    | "rejected"
    | "withdrawn";
  notes?: string;
  daysAgo: number;
}> = [
  {
    jobId: `${SEED_PREFIX}app_stripe`,
    jobTitle: "Software Engineer, Payments",
    companyName: "Stripe",
    jobUrl: "https://stripe.com/jobs",
    status: "interviewing",
    notes: "Recruiter screen done. Technical round scheduled for next week.",
    daysAgo: 12,
  },
  {
    jobId: `${SEED_PREFIX}app_linear`,
    jobTitle: "Senior Frontend Engineer",
    companyName: "Linear",
    status: "applied",
    notes: "Applied with the AI-optimized resume (92% match).",
    daysAgo: 5,
  },
  {
    jobId: `${SEED_PREFIX}app_figma`,
    jobTitle: "Frontend Engineer, Design Systems",
    companyName: "Figma",
    status: "offered",
    notes: "Offer received — reviewing compensation.",
    daysAgo: 28,
  },
  {
    jobId: `${SEED_PREFIX}app_airbnb`,
    jobTitle: "Full Stack Engineer",
    companyName: "Airbnb",
    status: "rejected",
    notes: "Rejected after the onsite. Feedback: wanted more backend depth.",
    daysAgo: 40,
  },
  {
    jobId: `${SEED_PREFIX}app_vercel`,
    jobTitle: "Full Stack Engineer",
    companyName: "Vercel",
    status: "saved",
    daysAgo: 2,
  },
];

export const seedDemoAccount = mutation({
  args: { secret: v.string(), email: v.string() },
  returns: v.object({
    savedJobs: v.number(),
    applications: v.number(),
  }),
  handler: async (ctx, args) => {
    const expected = process.env.MIGRATION_SECRET;
    if (!expected) throw new Error("MIGRATION_SECRET is not set on Convex");
    if (args.secret !== expected) throw new Error("Invalid secret");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    if (!user) {
      throw new Error(
        `No Convex user for ${args.email}. Sign in with that account once first.`
      );
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // Clear any previous seed so re-running doesn't duplicate.
    const priorLikes = await ctx.db
      .query("userJobInteractions")
      .withIndex("by_user_action", (q) =>
        q.eq("userId", user._id).eq("action", "liked")
      )
      .collect();
    for (const row of priorLikes) {
      if (row.jobId.startsWith(SEED_PREFIX)) await ctx.db.delete(row._id);
    }
    const priorApps = await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const row of priorApps) {
      if (row.jobId.startsWith(SEED_PREFIX)) await ctx.db.delete(row._id);
    }

    for (const [i, job] of SAVED_JOBS.entries()) {
      const { jobId, ...cached } = job;
      await ctx.db.insert("userJobInteractions", {
        userId: user._id,
        jobId,
        action: "liked",
        cachedJobData: {
          ...cached,
          job_apply_link: "https://example.com/apply",
        },
        timestamp: now - i * day,
      });
    }

    for (const app of APPLICATIONS) {
      const ts = now - app.daysAgo * day;
      await ctx.db.insert("applications", {
        userId: user._id,
        jobId: app.jobId,
        jobTitle: app.jobTitle,
        companyName: app.companyName,
        jobUrl: app.jobUrl,
        status: app.status,
        notes: app.notes,
        appliedAt: app.status === "saved" ? undefined : ts,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    return { savedJobs: SAVED_JOBS.length, applications: APPLICATIONS.length };
  },
});
