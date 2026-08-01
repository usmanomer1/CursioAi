import { v } from "convex/values";

/**
 * Shared validator for a denormalized job snapshot stored alongside a user
 * interaction (a "liked" / saved job). Kept in one place so the schema and the
 * mutations that write it can never disagree on shape.
 */
export const cachedJobDataValidator = v.object({
  job_title: v.string(),
  employer_name: v.string(),
  employer_logo: v.optional(v.string()),
  job_city: v.optional(v.string()),
  job_state: v.optional(v.string()),
  job_country: v.optional(v.string()),
  job_is_remote: v.boolean(),
  job_apply_link: v.string(),
  job_description: v.string(),
  job_posted_at_datetime_utc: v.optional(v.string()),
  match_score: v.optional(v.number()),
  match_label: v.optional(v.string()),
  match_reasons: v.optional(v.array(v.string())),
  missing_skills: v.optional(v.array(v.string())),
  key_strengths: v.optional(v.array(v.string())),
});

/** One ATS requirement surfaced while tailoring a resume to a job. */
export const tailorRequirementValidator = v.object({
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

/** Context loaded into the per-job AI coach. */
export const jobContextValidator = v.object({
  title: v.string(),
  company: v.string(),
  description: v.string(),
  matchScore: v.optional(v.number()),
  missingSkills: v.optional(v.array(v.string())),
  resumeText: v.optional(v.string()),
});
