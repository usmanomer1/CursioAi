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
