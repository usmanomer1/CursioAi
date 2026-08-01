import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { rateLimiter } from "./lib/limits";

const FEATURE_TO_LIMIT = {
  job_search: "jobSearch",
  resume_analyze: "resumeAnalyze",
  resume_generate: "resumeOptimize",
  job_chat: "jobChat",
} as const;

/**
 * Per-user rate limiting for every paid AI/JSearch action. Actions (which run
 * in the Node runtime and can't use the rate limiter transactionally) call
 * this via ctx.runMutation before doing any expensive work.
 *
 * Subscription/plan enforcement is handled separately by assertPaidPlan() in
 * lib/billing.ts, which reads the Clerk Billing `pla` claim off the identity
 * in the action itself.
 */
export const assertCanUseAi = internalMutation({
  args: {
    userId: v.id("users"),
    feature: v.union(
      v.literal("job_search"),
      v.literal("resume_analyze"),
      v.literal("resume_generate"),
      v.literal("job_chat")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      FEATURE_TO_LIMIT[args.feature],
      { key: args.userId }
    );
    if (!ok) {
      throw new Error(
        `Rate limit reached. Try again in ${Math.ceil(
          (retryAfter ?? 0) / 1000
        )} seconds.`
      );
    }
    return null;
  },
});
