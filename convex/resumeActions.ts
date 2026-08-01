"use node";

import { createHash } from "crypto";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { generateJson } from "./lib/ai/openrouter";
import {
  buildResumeScoringPrompt,
  calculateMatchLabel,
  normalizeScoringResult,
  scoringResultGenerationSchema,
} from "./lib/ai/scoring";
import {
  buildCombinedOptimizePrompt,
  structuredResumeGenerationSchema,
  stripNulls,
  structuredResumeToPlainText,
  normalizeStructuredResume,
  type StructuredResume,
} from "./lib/ai/resumeOptimizer";
import { generateResumePdf } from "./lib/pdf/resumePdf";
import type { ResumeLinks } from "./lib/pdf/resumeLinks";
import { assertPaidPlan } from "./lib/billing";

/** Per-user, collision-resistant cache key (SHA-256). Namespacing by userId
 * prevents one user's optimized resume from being served to another. */
function buildCacheKey(parts: string[]): string {
  return "opt_" + createHash("sha256").update(parts.join("^@")).digest("hex");
}

export const analyzeResume = action({
  args: {
    resumeText: v.string(),
    jobDescription: v.string(),
    jobTitle: v.string(),
    companyName: v.string(),
  },
  returns: v.object({
    analysisId: v.id("resumeAnalyses"),
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
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    assertPaidPlan(identity);

    const user = await ctx.runQuery(internal.usersInternal.getByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    await ctx.runMutation(internal.gating.assertCanUseAi, {
      userId: user._id,
      feature: "resume_analyze",
    });

    // A failure here propagates to the caller instead of being disguised as a
    // real (fabricated) score — the UI surfaces it as an error.
    const prompt = buildResumeScoringPrompt(
      args.resumeText,
      args.jobDescription,
      args.jobTitle,
      args.companyName
    );

    const result = normalizeScoringResult(
      await generateJson({
        prompt,
        schema: scoringResultGenerationSchema,
        temperature: 0.3,
      })
    );

    const analysisId: Id<"resumeAnalyses"> = await ctx.runMutation(
      internal.resumeInternal.saveAnalysis,
      {
        userId: user._id,
        resumeText: args.resumeText,
        jobDescription: args.jobDescription,
        jobTitle: args.jobTitle,
        companyName: args.companyName,
        result,
      }
    );

    await ctx.runMutation(internal.usersInternal.trackUsage, {
      userId: user._id,
      feature: "resume_analyze",
      metadata: { analysisId },
    });

    return {
      analysisId,
      ...result,
      matchLabel: calculateMatchLabel(result.score),
    };
  },
});

export const optimizeResume = action({
  args: {
    analysisId: v.id("resumeAnalyses"),
    additionalInstructions: v.optional(v.string()),
  },
  returns: v.object({
    generationId: v.id("resumeGenerations"),
    optimizedText: v.string(),
    changesSummary: v.array(v.string()),
    keywordsAdded: v.array(v.string()),
    scoreBefore: v.number(),
    scoreAfter: v.number(),
    pdfUrl: v.union(v.string(), v.null()),
    fileName: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    assertPaidPlan(identity);

    const analysis = (await ctx.runQuery(internal.resumeInternal.getAnalysis, {
      analysisId: args.analysisId,
    })) as Doc<"resumeAnalyses"> | null;
    if (!analysis) throw new Error("Analysis not found");

    const user = (await ctx.runQuery(internal.usersInternal.getByClerkId, {
      clerkId: identity.subject,
    })) as Doc<"users"> | null;
    if (!user || analysis.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.runMutation(internal.gating.assertCanUseAi, {
      userId: user._id,
      feature: "resume_generate",
    });

    const preservedLinks = (await ctx.runQuery(
      internal.resumeInternal.getPrimaryResumeLinks,
      { userId: user._id }
    )) as ResumeLinks | null;

    const cacheKey = buildCacheKey([
      user._id,
      analysis.resumeText.slice(0, 2000),
      analysis.jobDescription.slice(0, 1000),
      analysis.jobTitle,
      args.additionalInstructions ?? "",
    ]);

    let structured: StructuredResume;
    let optimizedText: string;
    let changesSummary: string[];
    let keywordsAdded: string[];
    let scoreAfter: number;

    const cached = await ctx.runQuery(
      internal.resumeInternal.getOptimizationCache,
      { cacheKey }
    );

    if (cached) {
      structured = normalizeStructuredResume(cached.structuredResume);
      optimizedText = cached.optimizedText;
      changesSummary = cached.changesSummary;
      keywordsAdded = cached.keywordsAdded;
      scoreAfter =
        cached.scoreAfter ?? structured.optimization_summary.ats_score_after;
    } else {
      const prompt = buildCombinedOptimizePrompt({
        resumeText: analysis.resumeText,
        jobDescription: analysis.jobDescription,
        jobTitle: analysis.jobTitle,
        companyName: analysis.companyName,
        missingSkills: analysis.missingSkills,
        additionalInstructions: args.additionalInstructions,
        preservedLinks: preservedLinks ?? undefined,
      });

      structured = normalizeStructuredResume(
        stripNulls(
          await generateJson({
            prompt,
            schema: structuredResumeGenerationSchema,
            temperature: 0.35,
          })
        ) as StructuredResume
      );

      optimizedText = structuredResumeToPlainText(structured);
      changesSummary = structured.optimization_summary.changes_made;
      keywordsAdded = structured.optimization_summary.keywords_added;
      scoreAfter = structured.optimization_summary.ats_score_after;

      await ctx.runMutation(internal.resumeInternal.setOptimizationCache, {
        cacheKey,
        structuredResume: structured,
        optimizedText,
        changesSummary,
        keywordsAdded,
        scoreAfter,
      });
    }

    const fileName = `resume_${analysis.jobTitle
      .replace(/\s+/g, "_")
      .slice(0, 40)}.pdf`;

    const pdfBytes = await generateResumePdf(structured, preservedLinks);
    const storageId: Id<"_storage"> = await ctx.storage.store(
      new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" })
    );

    const generationId: Id<"resumeGenerations"> = await ctx.runMutation(
      internal.resumeInternal.saveGeneration,
      {
        userId: user._id,
        analysisId: args.analysisId,
        optimizedText,
        structuredResume: structured,
        changesSummary,
        keywordsAdded,
        scoreBefore: analysis.score,
        scoreAfter,
        storageId,
        fileName,
      }
    );

    await ctx.runMutation(internal.usersInternal.trackUsage, {
      userId: user._id,
      feature: "resume_generate",
      metadata: { analysisId: args.analysisId, generationId },
    });

    const pdfUrl = await ctx.storage.getUrl(storageId);

    return {
      generationId,
      optimizedText,
      changesSummary,
      keywordsAdded,
      scoreBefore: analysis.score,
      scoreAfter,
      pdfUrl,
      fileName,
    };
  },
});
