import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser, getOptionalUser } from "./lib/auth";
import { assertPaidPlan } from "./lib/billing";
import { rateLimiter } from "./lib/limits";
import { tailorRequirementValidator } from "./lib/validators";

/**
 * Resume-tailoring jobs that run server-side, so closing the dialog or the
 * whole tab never loses progress:
 *
 *   start   → status "analyzing"  → scheduled runTailorAnalysis
 *           → "awaiting_selection" (+ notification) — resumable checkpoint
 *   choose  → status "generating" → scheduled runTailorGeneration
 *           → "done" (+ notification) with the diff/PDF payload
 *
 * The dialog is a pure renderer of this record's status.
 */

const ACTIVE_STATUSES = ["analyzing", "awaiting_selection", "generating"] as const;

async function latestForJob(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  jobId: string
) {
  const rows = await ctx.db
    .query("tailorJobs")
    .withIndex("by_user_job", (q) => q.eq("userId", userId).eq("jobId", jobId))
    .collect();
  rows.sort((a, b) => b.createdAt - a.createdAt);
  return rows[0] ?? null;
}

export const start = mutation({
  args: {
    jobId: v.string(),
    jobTitle: v.string(),
    companyName: v.string(),
    jobDescription: v.string(),
    jobUrl: v.optional(v.string()),
    /** Force a fresh run even if a finished/failed one exists. */
    restart: v.optional(v.boolean()),
  },
  returns: v.id("tailorJobs"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const identity = await ctx.auth.getUserIdentity();
    assertPaidPlan(identity);

    // Resume an in-flight run instead of double-charging the LLM.
    const existing = await latestForJob(ctx, user._id, args.jobId);
    if (
      existing &&
      (ACTIVE_STATUSES as readonly string[]).includes(existing.status)
    ) {
      return existing._id;
    }
    if (existing && existing.status === "done" && !args.restart) {
      return existing._id;
    }

    const resume = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();
    if (!resume || resume.resumeText.trim().length < 50) {
      throw new Error("Upload your resume first to tailor it for a job.");
    }

    const { ok, retryAfter } = await rateLimiter.limit(ctx, "resumeAnalyze", {
      key: user._id,
    });
    if (!ok) {
      throw new Error(
        `Rate limit reached. Try again in ${Math.ceil((retryAfter ?? 0) / 1000)}s.`
      );
    }

    const now = Date.now();
    const tailorJobId = await ctx.db.insert("tailorJobs", {
      userId: user._id,
      jobId: args.jobId,
      jobTitle: args.jobTitle,
      companyName: args.companyName,
      jobDescription: args.jobDescription.slice(0, 6000),
      jobUrl: args.jobUrl,
      status: "analyzing",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.jobResume.runTailorAnalysis, {
      tailorJobId,
    });
    return tailorJobId;
  },
});

export const choose = mutation({
  args: {
    tailorJobId: v.id("tailorJobs"),
    selectedKeywords: v.array(v.string()),
    mode: v.union(v.literal("quick"), v.literal("full")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const identity = await ctx.auth.getUserIdentity();
    assertPaidPlan(identity);

    const job = await ctx.db.get(args.tailorJobId);
    if (!job || job.userId !== user._id) throw new Error("Not found");
    if (job.status === "generating" || job.status === "analyzing") {
      throw new Error("This run is already in progress.");
    }

    const { ok, retryAfter } = await rateLimiter.limit(ctx, "resumeOptimize", {
      key: user._id,
    });
    if (!ok) {
      throw new Error(
        `Rate limit reached. Try again in ${Math.ceil((retryAfter ?? 0) / 1000)}s.`
      );
    }

    await ctx.db.patch(args.tailorJobId, {
      status: "generating",
      selectedKeywords: args.selectedKeywords,
      mode: args.mode,
      errorMessage: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.jobResume.runTailorGeneration, {
      tailorJobId: args.tailorJobId,
    });
    return null;
  },
});

/** Latest tailoring run for a job — the dialog's single source of truth. */
export const getForJob = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const user = await getOptionalUser(ctx);
    if (!user) return null;
    const job = await latestForJob(ctx, user._id, args.jobId);
    if (!job) return null;
    return {
      ...job,
      pdfUrl: job.storageId ? await ctx.storage.getUrl(job.storageId) : null,
      diffPdfUrl: job.diffStorageId
        ? await ctx.storage.getUrl(job.diffStorageId)
        : null,
    };
  },
});

/** Runs still in flight — powers the "in progress" affordances. */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("tailorJobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(25);
    return rows
      .filter((r) => (ACTIVE_STATUSES as readonly string[]).includes(r.status))
      .map((r) => ({
        _id: r._id,
        jobId: r.jobId,
        jobTitle: r.jobTitle,
        companyName: r.companyName,
        status: r.status,
      }));
  },
});

/* ── internal plumbing used by the scheduled actions ──────────────────── */

export const getInternal = internalQuery({
  args: { tailorJobId: v.id("tailorJobs") },
  handler: async (ctx, args) => ctx.db.get(args.tailorJobId),
});

export const finishAnalysis = internalMutation({
  args: {
    tailorJobId: v.id("tailorJobs"),
    requirements: v.array(tailorRequirementValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.tailorJobId);
    if (!job) return null;
    await ctx.db.patch(args.tailorJobId, {
      status: "awaiting_selection",
      requirements: args.requirements,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("notifications", {
      userId: job.userId,
      kind: "tailor_ready_for_review",
      title: "Requirements ready",
      body: `Pick what to include for ${job.jobTitle} at ${job.companyName}.`,
      jobId: job.jobId,
      tailorJobId: args.tailorJobId,
      read: false,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const finishGeneration = internalMutation({
  args: {
    tailorJobId: v.id("tailorJobs"),
    generationId: v.id("resumeGenerations"),
    originalText: v.string(),
    optimizedText: v.string(),
    changesSummary: v.array(v.string()),
    keywordsAdded: v.array(v.string()),
    scoreBefore: v.number(),
    scoreAfter: v.number(),
    storageId: v.id("_storage"),
    diffStorageId: v.optional(v.id("_storage")),
    fileName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { tailorJobId, ...fields } = args;
    const job = await ctx.db.get(tailorJobId);
    if (!job) return null;
    await ctx.db.patch(tailorJobId, {
      status: "done",
      ...fields,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("notifications", {
      userId: job.userId,
      kind: "tailor_done",
      title: "Tailored resume ready",
      body: `Your resume for ${job.jobTitle} at ${job.companyName} is ready to review and download.`,
      jobId: job.jobId,
      tailorJobId,
      read: false,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const setError = internalMutation({
  args: { tailorJobId: v.id("tailorJobs"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.tailorJobId);
    if (!job) return null;
    await ctx.db.patch(args.tailorJobId, {
      status: "error",
      errorMessage: args.message,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("notifications", {
      userId: job.userId,
      kind: "tailor_error",
      title: "Tailoring failed",
      body: `${job.jobTitle} at ${job.companyName}: ${args.message}`,
      jobId: job.jobId,
      tailorJobId: args.tailorJobId,
      read: false,
      createdAt: Date.now(),
    });
    return null;
  },
});
