import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getOptionalUser } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);
  },
});

export const create = mutation({
  args: {
    jobId: v.string(),
    jobTitle: v.string(),
    companyName: v.string(),
    jobUrl: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("saved"),
        v.literal("applied"),
        v.literal("interviewing"),
        v.literal("offered"),
        v.literal("rejected"),
        v.literal("withdrawn")
      )
    ),
    notes: v.optional(v.string()),
  },
  returns: v.id("applications"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("applications", {
      userId: user._id,
      jobId: args.jobId,
      jobTitle: args.jobTitle,
      companyName: args.companyName,
      jobUrl: args.jobUrl,
      status: args.status ?? "saved",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: v.union(
      v.literal("saved"),
      v.literal("applied"),
      v.literal("interviewing"),
      v.literal("offered"),
      v.literal("rejected"),
      v.literal("withdrawn")
    ),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.userId !== user._id) {
      throw new Error("Application not found");
    }
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.status === "applied") patch.appliedAt = Date.now();
    await ctx.db.patch(args.applicationId, patch);
    return null;
  },
});

export const remove = mutation({
  args: { applicationId: v.id("applications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.userId !== user._id) {
      throw new Error("Application not found");
    }
    await ctx.db.delete(args.applicationId);
    return null;
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return { total: 0, byStatus: {} as Record<string, number> };
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const byStatus: Record<string, number> = {};
    for (const app of apps) {
      byStatus[app.status] = (byStatus[app.status] ?? 0) + 1;
    }
    return { total: apps.length, byStatus };
  },
});
