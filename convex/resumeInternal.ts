import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { calculateMatchLabel } from "./lib/ai/scoring";

export const saveAnalysis = internalMutation({
  args: {
    userId: v.id("users"),
    resumeText: v.string(),
    jobDescription: v.string(),
    jobTitle: v.string(),
    companyName: v.string(),
    result: v.object({
      score: v.number(),
      matchReasons: v.array(v.string()),
      missingSkills: v.array(v.string()),
      keyStrengths: v.array(v.string()),
      breakdown: v.object({
        skills: v.number(),
        experience: v.number(),
        education: v.number(),
        career: v.number(),
        company: v.number(),
        timing: v.number(),
      }),
    }),
  },
  returns: v.id("resumeAnalyses"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("resumeAnalyses", {
      userId: args.userId,
      resumeText: args.resumeText,
      jobDescription: args.jobDescription,
      jobTitle: args.jobTitle,
      companyName: args.companyName,
      score: args.result.score,
      matchLabel: calculateMatchLabel(args.result.score),
      matchReasons: args.result.matchReasons,
      missingSkills: args.result.missingSkills,
      keyStrengths: args.result.keyStrengths,
      breakdown: args.result.breakdown,
      status: "completed",
      createdAt: Date.now(),
    });
  },
});

export const getAnalysis = internalQuery({
  args: { analysisId: v.id("resumeAnalyses") },
  returns: v.union(
    v.object({
      _id: v.id("resumeAnalyses"),
      _creationTime: v.number(),
      userId: v.id("users"),
      resumeText: v.string(),
      jobDescription: v.string(),
      jobTitle: v.string(),
      companyName: v.string(),
      score: v.number(),
      matchLabel: v.string(),
      matchReasons: v.array(v.string()),
      missingSkills: v.array(v.string()),
      keyStrengths: v.array(v.string()),
      breakdown: v.object({
        skills: v.number(),
        experience: v.number(),
        education: v.number(),
        career: v.number(),
        company: v.number(),
        timing: v.number(),
      }),
      sections: v.optional(v.any()),
      status: v.union(v.literal("completed"), v.literal("error")),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.analysisId);
  },
});

export const getOptimizationCache = internalQuery({
  args: { cacheKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("optimizationCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();
  },
});

export const getPrimaryResumeLinks = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const resume = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();
    return resume?.resumeLinks ?? null;
  },
});

export const getPrimaryResume = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();
  },
});

/** Persist a generation that was tailored to a specific job posting. */
export const saveJobGeneration = internalMutation({
  args: {
    userId: v.id("users"),
    jobId: v.string(),
    jobTitle: v.string(),
    companyName: v.string(),
    optimizedText: v.string(),
    structuredResume: v.optional(v.any()),
    changesSummary: v.array(v.string()),
    keywordsAdded: v.array(v.string()),
    scoreBefore: v.optional(v.number()),
    scoreAfter: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
  },
  returns: v.id("resumeGenerations"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("resumeGenerations", {
      ...args,
      status: "completed",
      createdAt: Date.now(),
    });
  },
});

export const getLatestGenerationForAnalysis = internalQuery({
  args: { analysisId: v.id("resumeAnalyses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("resumeGenerations")
      .withIndex("by_analysis", (q) => q.eq("analysisId", args.analysisId))
      .order("desc")
      .first();
  },
});

export const setOptimizationCache = internalMutation({
  args: {
    cacheKey: v.string(),
    structuredResume: v.any(),
    optimizedText: v.string(),
    changesSummary: v.array(v.string()),
    keywordsAdded: v.array(v.string()),
    scoreAfter: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("optimizationCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        structuredResume: args.structuredResume,
        optimizedText: args.optimizedText,
        changesSummary: args.changesSummary,
        keywordsAdded: args.keywordsAdded,
        scoreAfter: args.scoreAfter,
        createdAt: Date.now(),
      });
      return null;
    }

    await ctx.db.insert("optimizationCache", {
      cacheKey: args.cacheKey,
      structuredResume: args.structuredResume,
      optimizedText: args.optimizedText,
      changesSummary: args.changesSummary,
      keywordsAdded: args.keywordsAdded,
      scoreAfter: args.scoreAfter,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const saveGeneration = internalMutation({
  args: {
    userId: v.id("users"),
    analysisId: v.id("resumeAnalyses"),
    optimizedText: v.string(),
    structuredResume: v.optional(v.any()),
    changesSummary: v.array(v.string()),
    keywordsAdded: v.array(v.string()),
    scoreBefore: v.optional(v.number()),
    scoreAfter: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
  },
  returns: v.id("resumeGenerations"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("resumeGenerations", {
      userId: args.userId,
      analysisId: args.analysisId,
      optimizedText: args.optimizedText,
      structuredResume: args.structuredResume,
      changesSummary: args.changesSummary,
      keywordsAdded: args.keywordsAdded,
      scoreBefore: args.scoreBefore,
      scoreAfter: args.scoreAfter,
      storageId: args.storageId,
      fileName: args.fileName,
      status: "completed",
      createdAt: Date.now(),
    });
  },
});
