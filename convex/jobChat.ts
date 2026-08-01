import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getOptionalUser } from "./lib/auth";
import { jobContextValidator } from "./lib/validators";

export const getJobChatThread = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const user = await getOptionalUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("jobChatThreads")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", user._id).eq("jobId", args.jobId)
      )
      .unique();
  },
});

export const listMessages = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("jobChatMessages")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", user._id).eq("jobId", args.jobId)
      )
      .order("asc")
      .take(200);
  },
});

export const listJobChatThreads = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("jobChatThreads")
      .withIndex("by_user_job", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});

export const saveJobChatThread = mutation({
  args: {
    jobId: v.string(),
    agentThreadId: v.string(),
    jobContext: jobContextValidator,
  },
  returns: v.id("jobChatThreads"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("jobChatThreads")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", user._id).eq("jobId", args.jobId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        agentThreadId: args.agentThreadId,
        jobContext: args.jobContext,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("jobChatThreads", {
      userId: user._id,
      jobId: args.jobId,
      agentThreadId: args.agentThreadId,
      jobContext: args.jobContext,
      createdAt: now,
      updatedAt: now,
    });
  },
});
