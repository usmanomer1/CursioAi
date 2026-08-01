"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateJson } from "./lib/ai/openrouter";
import {
  batchMatchGenerationSchema,
  buildJobBatchMatchingPrompt,
  calculateMatchLabel,
} from "./lib/ai/scoring";
import {
  searchJobs,
  simplifyJobsForMatching,
} from "./lib/jsearch/client";
import type { TransformedJob } from "./lib/jsearch/types";
import { assertPaidPlan } from "./lib/billing";

const BATCH_SIZE = 5;

export const searchAndMatchJobs = action({
  args: {
    sessionId: v.id("jobSearchSessions"),
    query: v.string(),
    location: v.optional(v.string()),
    resumeText: v.string(),
    numJobs: v.optional(v.number()),
    useAI: v.optional(v.boolean()),
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
  returns: v.object({
    sessionId: v.id("jobSearchSessions"),
    totalFound: v.number(),
    jobs: v.array(v.any()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    assertPaidPlan(identity);

    const user = await ctx.runQuery(internal.usersInternal.getByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    // Server-side subscription + rate-limit gate before any paid work.
    await ctx.runMutation(internal.gating.assertCanUseAi, {
      userId: user._id,
      feature: "job_search",
    });

    await ctx.runMutation(internal.jobs.updateSessionStatus, {
      sessionId: args.sessionId,
      status: "searching",
    });

    try {
      const rawJobs = await searchJobs({
        query: args.query,
        location: args.location,
        numJobs: args.numJobs ?? 20,
        datePosted: args.filters?.datePosted,
        remote: args.filters?.remote,
        employmentTypes: args.filters?.employmentTypes,
        experienceLevel: args.filters?.experienceLevel,
        radius: args.filters?.radius,
      });

      await ctx.runMutation(internal.jobs.updateSessionStatus, {
        sessionId: args.sessionId,
        status: "processing",
        totalFound: rawJobs.length,
      });

      let enrichedJobs: TransformedJob[] = rawJobs;

      if (args.useAI !== false && args.resumeText.length >= 50) {
        enrichedJobs = await matchJobsWithAI(rawJobs, args.resumeText);
      }

      // Persist the results so the search survives a page refresh and can be
      // reopened from the recent-searches list.
      await ctx.runMutation(internal.jobs.saveSessionResults, {
        sessionId: args.sessionId,
        userId: user._id,
        jobs: enrichedJobs,
      });

      const scoredCount = enrichedJobs.filter(
        (j) => j.match_score !== undefined
      ).length;

      await ctx.runMutation(internal.jobs.updateSessionStatus, {
        sessionId: args.sessionId,
        status: "completed",
        totalFound: enrichedJobs.length,
        processedCount: scoredCount,
      });

      await ctx.runMutation(internal.usersInternal.trackUsage, {
        userId: user._id,
        feature: "job_search" as const,
        metadata: { query: args.query, jobCount: enrichedJobs.length },
      });

      return {
        sessionId: args.sessionId,
        totalFound: enrichedJobs.length,
        jobs: enrichedJobs,
      };
    } catch (error) {
      await ctx.runMutation(internal.jobs.updateSessionStatus, {
        sessionId: args.sessionId,
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Search failed",
      });
      throw error;
    }
  },
});

async function matchJobsWithAI(
  jobs: TransformedJob[],
  resumeText: string
): Promise<TransformedJob[]> {
  const batches: TransformedJob[][] = [];
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    batches.push(jobs.slice(i, i + BATCH_SIZE));
  }

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      try {
        const simplified = simplifyJobsForMatching(batch);
        const prompt = buildJobBatchMatchingPrompt(simplified, resumeText);
        const result = await generateJson({
          prompt,
          schema: batchMatchGenerationSchema,
          temperature: 0.3,
        });

        // Map AI matches back to jobs — prefer exact jobId, fall back to batch index.
        return batch.map((job, idx) => {
          const raw =
            result.matches.find((m) => m.jobId === job.job_id) ??
            result.matches[idx];
          if (!raw) return null;

          // Some models return 0–1 fractions despite the 0–100 instruction.
          const rawScore = raw.score <= 1 ? raw.score * 100 : raw.score;
          const score = Math.max(0, Math.min(100, Math.round(rawScore)));
          return {
            jobId: job.job_id,
            score,
            // Derive the label from the score rather than trusting the model's
            // wording — different models return different casing ("Strong
            // Match" vs "STRONG MATCH"), which leaks into the UI badge.
            matchLabel: calculateMatchLabel(score),
            matchReasons: raw.matchReasons ?? [],
            missingSkills: raw.missingSkills ?? [],
            keyStrengths: raw.keyStrengths ?? [],
          };
        });
      } catch (error) {
        console.error(
          "Job batch matching failed:",
          error instanceof Error ? error.message : error
        );
        return batch.map(() => null);
      }
    })
  );

  const matchById = new Map(
    batchResults
      .flat()
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => [m.jobId, m] as const)
  );

  const enriched = jobs.map((job) => {
    const match = matchById.get(job.job_id);
    if (!match) return job;
    return {
      ...job,
      match_score: match.score,
      match_label: match.matchLabel,
      match_reasons: match.matchReasons,
      missing_skills: match.missingSkills,
      key_strengths: match.keyStrengths,
    };
  });

  return enriched.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
}
