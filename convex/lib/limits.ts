import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

/**
 * Per-user throttles for the expensive, externally-billed operations
 * (OpenRouter LLM calls, JSearch quota, file storage). Centralized so every
 * entry point shares one budget per feature.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  jobSearch: { kind: "fixed window", rate: 10, period: HOUR },
  resumeAnalyze: { kind: "fixed window", rate: 20, period: HOUR },
  resumeOptimize: { kind: "fixed window", rate: 12, period: HOUR },
  jobChat: { kind: "fixed window", rate: 60, period: HOUR },
  resumeUpload: { kind: "fixed window", rate: 20, period: HOUR },
});
