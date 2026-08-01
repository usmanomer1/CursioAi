import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      onboardingComplete: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const trackUsage = internalMutation({
  args: {
    userId: v.id("users"),
    feature: v.union(
      v.literal("job_search"),
      v.literal("resume_analyze"),
      v.literal("resume_generate"),
      v.literal("job_chat")
    ),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      feature: args.feature,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
    return null;
  },
});
