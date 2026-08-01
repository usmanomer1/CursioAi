import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser, getOptionalUser } from "./lib/auth";
import { cachedJobDataValidator } from "./lib/validators";

export const createSearchSession = mutation({
  args: {
    query: v.string(),
    location: v.optional(v.string()),
    resumeText: v.string(),
    filters: v.optional(
      v.object({
        datePosted: v.optional(v.string()),
        remote: v.optional(v.boolean()),
        employmentTypes: v.optional(v.array(v.string())),
        experienceLevel: v.optional(v.array(v.string())),
        radius: v.optional(v.number()),
      })
    ),
  },
  returns: v.id("jobSearchSessions"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    // Subscription + rate-limit enforcement happens in the search action
    // (searchAndMatchJobs) right before any paid work is done.
    return await ctx.db.insert("jobSearchSessions", {
      userId: user._id,
      query: args.query,
      location: args.location,
      resumeText: args.resumeText,
      filters: args.filters,
      status: "initializing",
      totalFound: 0,
      processedCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateSessionStatus = internalMutation({
  args: {
    sessionId: v.id("jobSearchSessions"),
    status: v.union(
      v.literal("initializing"),
      v.literal("searching"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),
    totalFound: v.optional(v.number()),
    processedCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { sessionId, ...updates } = args;
    const patch: Record<string, unknown> = { ...updates };
    if (updates.status === "completed") {
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(sessionId, patch);
    return null;
  },
});

/**
 * Persist the enriched results of a search so they survive a page refresh.
 * The full enriched job (including match fields) already lives in `jobData`,
 * so that's the single source of truth; `batchIndex` carries the rank.
 */
export const saveSessionResults = internalMutation({
  args: {
    sessionId: v.id("jobSearchSessions"),
    userId: v.id("users"),
    jobs: v.array(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    for (let i = 0; i < args.jobs.length; i++) {
      const job = args.jobs[i];
      await ctx.db.insert("jobs", {
        sessionId: args.sessionId,
        userId: args.userId,
        jobId: String(job.job_id ?? `idx_${i}`),
        jobData: job,
        matchScore: job.match_score,
        matchLabel: job.match_label,
        batchIndex: i,
        createdAt: now,
      });
    }
    return null;
  },
});

/** Most recent search plus its results — used to rehydrate the page. */
export const getLatestSearch = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return null;

    const session = await ctx.db
      .query("jobSearchSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (!session) return null;

    const rows = await ctx.db
      .query("jobs")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(100);

    return {
      sessionId: session._id,
      query: session.query,
      location: session.location ?? "",
      filters: session.filters ?? null,
      status: session.status,
      createdAt: session.createdAt,
      jobs: rows
        .sort((a, b) => a.batchIndex - b.batchIndex)
        .map((r) => r.jobData),
    };
  },
});

/** Results for a specific past search (used by the recent-searches list). */
export const getSessionJobs = query({
  args: { sessionId: v.id("jobSearchSessions") },
  handler: async (ctx, args) => {
    const user = await getOptionalUser(ctx);
    if (!user) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) return null;

    const rows = await ctx.db
      .query("jobs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(100);

    return {
      sessionId: session._id,
      query: session.query,
      location: session.location ?? "",
      jobs: rows
        .sort((a, b) => a.batchIndex - b.batchIndex)
        .map((r) => r.jobData),
    };
  },
});

export const getRecentSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("jobSearchSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(10);
  },
});

export const likeJob = mutation({
  args: {
    jobId: v.string(),
    cachedJobData: cachedJobDataValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("userJobInteractions")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", user._id).eq("jobId", args.jobId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        action: "liked",
        cachedJobData: args.cachedJobData,
        timestamp: Date.now(),
      });
    } else {
      await ctx.db.insert("userJobInteractions", {
        userId: user._id,
        jobId: args.jobId,
        action: "liked",
        cachedJobData: args.cachedJobData,
        timestamp: Date.now(),
      });
    }
    return null;
  },
});

export const getLikedJobs = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];
    const interactions = await ctx.db
      .query("userJobInteractions")
      .withIndex("by_user_action", (q) =>
        q.eq("userId", user._id).eq("action", "liked")
      )
      .order("desc")
      .take(100);
    return interactions.filter((i) => i.cachedJobData);
  },
});

export const unlikeJob = mutation({
  args: { jobId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("userJobInteractions")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", user._id).eq("jobId", args.jobId)
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});
