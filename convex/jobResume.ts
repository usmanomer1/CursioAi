"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { generateJson } from "./lib/ai/openrouter";
import {
  buildRequirementsPrompt,
  jobRequirementsSchema,
  buildCombinedOptimizePrompt,
  structuredResumeGenerationSchema,
  stripNulls,
  structuredResumeToPlainText,
  normalizeStructuredResume,
  type StructuredResume,
} from "./lib/ai/resumeOptimizer";
import { generateResumePdfBundle } from "./lib/pdf/resumePdf";
import type { ResumeLinks } from "./lib/pdf/resumeLinks";

/**
 * Background workers for resume tailoring. Scheduled from convex/tailor.ts,
 * they run to completion server-side whether or not the user keeps the tab
 * open; every outcome (including failure) is written back to the tailorJobs
 * record, which also produces the in-app notification.
 *
 * Auth, plan and rate-limit checks happen in the scheduling mutations —
 * scheduled actions have no request identity of their own.
 */

export const runTailorAnalysis = internalAction({
  args: { tailorJobId: v.id("tailorJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = (await ctx.runQuery(internal.tailor.getInternal, {
      tailorJobId: args.tailorJobId,
    })) as Doc<"tailorJobs"> | null;
    if (!job || job.status !== "analyzing") return null;

    try {
      const resume = (await ctx.runQuery(
        internal.resumeInternal.getPrimaryResume,
        { userId: job.userId }
      )) as Doc<"resumes"> | null;
      if (!resume || resume.resumeText.trim().length < 50) {
        throw new Error("No resume on file — upload one and try again.");
      }

      const result = await generateJson({
        prompt: buildRequirementsPrompt({
          resumeText: resume.resumeText,
          jobDescription: job.jobDescription,
          jobTitle: job.jobTitle,
          companyName: job.companyName,
        }),
        schema: jobRequirementsSchema,
        temperature: 0.2,
      });

      await ctx.runMutation(internal.tailor.finishAnalysis, {
        tailorJobId: args.tailorJobId,
        requirements: result.requirements,
      });
    } catch (error) {
      await ctx.runMutation(internal.tailor.setError, {
        tailorJobId: args.tailorJobId,
        message:
          error instanceof Error ? error.message : "Analysis failed — try again.",
      });
    }
    return null;
  },
});

export const runTailorGeneration = internalAction({
  args: { tailorJobId: v.id("tailorJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = (await ctx.runQuery(internal.tailor.getInternal, {
      tailorJobId: args.tailorJobId,
    })) as Doc<"tailorJobs"> | null;
    if (!job || job.status !== "generating") return null;

    try {
      const resume = (await ctx.runQuery(
        internal.resumeInternal.getPrimaryResume,
        { userId: job.userId }
      )) as Doc<"resumes"> | null;
      if (!resume || resume.resumeText.trim().length < 50) {
        throw new Error("No resume on file — upload one and try again.");
      }

      const selected = job.selectedKeywords ?? [];
      const mode = job.mode ?? "full";
      const modeInstruction =
        mode === "quick"
          ? "QUICK PASS: keep the existing bullet structure and wording as intact as possible. Only weave the selected keywords into bullets where they are already truthful, and tighten wording minimally."
          : "FULL REWRITE: rewrite the summary and every bullet for maximum impact against this job — strong action verbs, quantified outcomes where already implied, reordered so the most relevant experience leads.";

      const structured = await generateJson({
        prompt:
          buildCombinedOptimizePrompt({
            resumeText: resume.resumeText,
            jobDescription: job.jobDescription,
            jobTitle: job.jobTitle,
            companyName: job.companyName,
            missingSkills: selected,
            preservedLinks: resume.resumeLinks as ResumeLinks | undefined,
          }) +
          `\n\nMODE: ${modeInstruction}\n\nThe candidate specifically asked you to address these requirements (only where truthful): ${
            selected.join(", ") || "none selected"
          }`,
        schema: structuredResumeGenerationSchema,
        temperature: mode === "quick" ? 0.25 : 0.4,
      });

      const normalized: StructuredResume = normalizeStructuredResume(
        stripNulls(structured) as StructuredResume
      );
      const optimizedText = structuredResumeToPlainText(normalized);

      const bundle = await generateResumePdfBundle(
        normalized,
        resume.resumeLinks as ResumeLinks | undefined,
        resume.resumeText
      );
      const storageId = await ctx.storage.store(
        new Blob([new Uint8Array(bundle.pdf)], { type: "application/pdf" })
      );
      const diffStorageId = bundle.highlighted
        ? await ctx.storage.store(
            new Blob([new Uint8Array(bundle.highlighted)], {
              type: "application/pdf",
            })
          )
        : undefined;

      const safeCompany = job.companyName
        .replace(/[^A-Za-z0-9]+/g, "_")
        .slice(0, 24);
      const safeTitle = job.jobTitle.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 32);
      const fileName = `resume_${safeCompany}_${safeTitle}.pdf`;

      const generationId: Id<"resumeGenerations"> = await ctx.runMutation(
        internal.resumeInternal.saveJobGeneration,
        {
          userId: job.userId,
          jobId: job.jobId,
          jobTitle: job.jobTitle,
          companyName: job.companyName,
          optimizedText,
          structuredResume: normalized,
          changesSummary: normalized.optimization_summary.changes_made,
          keywordsAdded: normalized.optimization_summary.keywords_added,
          scoreBefore: normalized.optimization_summary.ats_score_before,
          scoreAfter: normalized.optimization_summary.ats_score_after,
          storageId,
          fileName,
        }
      );

      await ctx.runMutation(internal.tailor.finishGeneration, {
        tailorJobId: args.tailorJobId,
        generationId,
        originalText: resume.resumeText,
        optimizedText,
        changesSummary: normalized.optimization_summary.changes_made,
        keywordsAdded: normalized.optimization_summary.keywords_added,
        scoreBefore: normalized.optimization_summary.ats_score_before,
        scoreAfter: normalized.optimization_summary.ats_score_after,
        storageId,
        diffStorageId,
        fileName,
      });

      await ctx.runMutation(internal.usersInternal.trackUsage, {
        userId: job.userId,
        feature: "resume_generate",
        metadata: { jobId: job.jobId, mode },
      });
    } catch (error) {
      await ctx.runMutation(internal.tailor.setError, {
        tailorJobId: args.tailorJobId,
        message:
          error instanceof Error
            ? error.message
            : "Generation failed — try again.",
      });
    }
    return null;
  },
});
