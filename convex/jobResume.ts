"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { generateJson } from "./lib/ai/openrouter";
import {
  buildRequirementsPrompt,
  jobRequirementsSchema,
  buildCombinedOptimizePrompt,
  structuredResumeSchema,
  structuredResumeToPlainText,
  normalizeStructuredResume,
  type StructuredResume,
} from "./lib/ai/resumeOptimizer";
import { generateResumePdf } from "./lib/pdf/resumePdf";
import type { ResumeLinks } from "./lib/pdf/resumeLinks";
import { assertPaidPlan } from "./lib/billing";

/**
 * Job-targeted resume generation.
 *
 * Two steps so the user stays in control:
 *   1. analyzeJobRequirements — what the ATS wants that the resume lacks
 *   2. generateResumeForJob   — rewrite, honouring only the picked items
 *
 * Both reuse the existing one-page Jake's-template PDF pipeline.
 */

const requirementValidator = v.object({
  keyword: v.string(),
  kind: v.union(
    v.literal("skill"),
    v.literal("tool"),
    v.literal("qualification"),
    v.literal("responsibility")
  ),
  importance: v.union(
    v.literal("critical"),
    v.literal("preferred"),
    v.literal("nice_to_have")
  ),
  rationale: v.string(),
  alreadyPresent: v.boolean(),
});

export const analyzeJobRequirements = action({
  args: {
    jobTitle: v.string(),
    companyName: v.string(),
    jobDescription: v.string(),
  },
  returns: v.object({
    requirements: v.array(requirementValidator),
    resumeText: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    assertPaidPlan(identity);

    const user = (await ctx.runQuery(internal.usersInternal.getByClerkId, {
      clerkId: identity.subject,
    })) as Doc<"users"> | null;
    if (!user) throw new Error("User not found");

    await ctx.runMutation(internal.gating.assertCanUseAi, {
      userId: user._id,
      feature: "resume_analyze",
    });

    const resume = (await ctx.runQuery(
      internal.resumeInternal.getPrimaryResume,
      { userId: user._id }
    )) as Doc<"resumes"> | null;

    if (!resume || resume.resumeText.trim().length < 50) {
      throw new Error("Upload your resume first to tailor it for a job.");
    }

    const result = await generateJson({
      prompt: buildRequirementsPrompt({
        resumeText: resume.resumeText,
        jobDescription: args.jobDescription,
        jobTitle: args.jobTitle,
        companyName: args.companyName,
      }),
      schema: jobRequirementsSchema,
      temperature: 0.2,
    });

    return {
      requirements: result.requirements,
      resumeText: resume.resumeText,
    };
  },
});

export const generateResumeForJob = action({
  args: {
    jobId: v.string(),
    jobTitle: v.string(),
    companyName: v.string(),
    jobDescription: v.string(),
    jobUrl: v.optional(v.string()),
    /** Requirement keywords the user ticked to weave in. */
    selectedKeywords: v.array(v.string()),
    /** quick = light keyword pass, full = full rewrite of bullets/summary. */
    mode: v.union(v.literal("quick"), v.literal("full")),
  },
  returns: v.object({
    generationId: v.id("resumeGenerations"),
    originalText: v.string(),
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

    const user = (await ctx.runQuery(internal.usersInternal.getByClerkId, {
      clerkId: identity.subject,
    })) as Doc<"users"> | null;
    if (!user) throw new Error("User not found");

    await ctx.runMutation(internal.gating.assertCanUseAi, {
      userId: user._id,
      feature: "resume_generate",
    });

    const resume = (await ctx.runQuery(
      internal.resumeInternal.getPrimaryResume,
      { userId: user._id }
    )) as Doc<"resumes"> | null;
    if (!resume || resume.resumeText.trim().length < 50) {
      throw new Error("Upload your resume first to tailor it for a job.");
    }

    const modeInstruction =
      args.mode === "quick"
        ? "QUICK PASS: keep the existing bullet structure and wording as intact as possible. Only weave the selected keywords into bullets where they are already truthful, and tighten wording minimally."
        : "FULL REWRITE: rewrite the summary and every bullet for maximum impact against this job — strong action verbs, quantified outcomes where already implied, reordered so the most relevant experience leads.";

    const structured = await generateJson({
      prompt:
        buildCombinedOptimizePrompt({
          resumeText: resume.resumeText,
          jobDescription: args.jobDescription,
          jobTitle: args.jobTitle,
          companyName: args.companyName,
          missingSkills: args.selectedKeywords,
          preservedLinks: resume.resumeLinks as ResumeLinks | undefined,
        }) +
        `\n\nMODE: ${modeInstruction}\n\nThe candidate specifically asked you to address these requirements (only where truthful): ${
          args.selectedKeywords.join(", ") || "none selected"
        }`,
      schema: structuredResumeSchema,
      temperature: args.mode === "quick" ? 0.25 : 0.4,
    });

    const normalized: StructuredResume = normalizeStructuredResume(structured);
    const optimizedText = structuredResumeToPlainText(normalized);

    const pdfBytes = await generateResumePdf(
      normalized,
      resume.resumeLinks as ResumeLinks | undefined
    );
    const storageId = await ctx.storage.store(
      new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" })
    );

    const safeCompany = args.companyName.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 24);
    const safeTitle = args.jobTitle.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 32);
    const fileName = `resume_${safeCompany}_${safeTitle}.pdf`;

    const scoreBefore = normalized.optimization_summary.ats_score_before;
    const scoreAfter = normalized.optimization_summary.ats_score_after;

    const generationId: Id<"resumeGenerations"> = await ctx.runMutation(
      internal.resumeInternal.saveJobGeneration,
      {
        userId: user._id,
        jobId: args.jobId,
        jobTitle: args.jobTitle,
        companyName: args.companyName,
        optimizedText,
        structuredResume: normalized,
        changesSummary: normalized.optimization_summary.changes_made,
        keywordsAdded: normalized.optimization_summary.keywords_added,
        scoreBefore,
        scoreAfter,
        storageId,
        fileName,
      }
    );

    await ctx.runMutation(internal.usersInternal.trackUsage, {
      userId: user._id,
      feature: "resume_generate",
      metadata: { jobId: args.jobId, mode: args.mode },
    });

    return {
      generationId,
      originalText: resume.resumeText,
      optimizedText,
      changesSummary: normalized.optimization_summary.changes_made,
      keywordsAdded: normalized.optimization_summary.keywords_added,
      scoreBefore,
      scoreAfter,
      pdfUrl: await ctx.storage.getUrl(storageId),
      fileName,
    };
  },
});
