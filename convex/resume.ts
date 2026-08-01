import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getOptionalUser } from "./lib/auth";

export const listAnalyses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("resumeAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
  },
});

export const getAnalysisById = query({
  args: { analysisId: v.id("resumeAnalyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.userId !== user._id) {
      throw new Error("Analysis not found");
    }
    return analysis;
  },
});

export const listGenerations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("resumeGenerations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
  },
});

export const deleteAnalysis = mutation({
  args: { analysisId: v.id("resumeAnalyses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.userId !== user._id) {
      throw new Error("Analysis not found");
    }
    await ctx.db.delete(args.analysisId);
    return null;
  },
});
