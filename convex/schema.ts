import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { cachedJobDataValidator, jobContextValidator } from "./lib/validators";

const cachedJobData = cachedJobDataValidator;

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    onboardingComplete: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  profiles: defineTable({
    userId: v.id("users"),
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    jobPreferences: v.optional(
      v.object({
        desiredTitles: v.optional(v.array(v.string())),
        desiredLocations: v.optional(v.array(v.string())),
        remotePreference: v.optional(v.string()),
        salaryMin: v.optional(v.number()),
        salaryMax: v.optional(v.number()),
      })
    ),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  resumes: defineTable({
    userId: v.id("users"),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    resumeText: v.string(),
    resumeLinks: v.optional(
      v.object({
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        linkedin: v.optional(v.string()),
        github: v.optional(v.string()),
        projectLinks: v.optional(
          v.array(
            v.object({
              name: v.string(),
              url: v.string(),
              label: v.optional(v.string()),
            })
          )
        ),
      })
    ),
    isPrimary: v.boolean(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  resumeAnalyses: defineTable({
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
    status: v.union(v.literal("completed"), v.literal("error")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_job", ["userId", "jobTitle"]),

  resumeGenerations: defineTable({
    userId: v.id("users"),
    analysisId: v.id("resumeAnalyses"),
    optimizedText: v.string(),
    structuredResume: v.optional(v.any()),
    changesSummary: v.optional(v.array(v.string())),
    keywordsAdded: v.optional(v.array(v.string())),
    scoreBefore: v.optional(v.number()),
    scoreAfter: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("error")
    ),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_analysis", ["analysisId"]),

  optimizationCache: defineTable({
    cacheKey: v.string(),
    structuredResume: v.any(),
    optimizedText: v.string(),
    changesSummary: v.array(v.string()),
    keywordsAdded: v.array(v.string()),
    scoreAfter: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_key", ["cacheKey"]),

  jobSearchSessions: defineTable({
    userId: v.id("users"),
    query: v.string(),
    location: v.optional(v.string()),
    resumeText: v.string(),
    filters: v.optional(v.any()),
    status: v.union(
      v.literal("initializing"),
      v.literal("searching"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("error")
    ),
    totalFound: v.number(),
    processedCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId", "createdAt"]),

  jobs: defineTable({
    sessionId: v.id("jobSearchSessions"),
    userId: v.id("users"),
    jobId: v.string(),
    jobData: v.any(),
    matchScore: v.optional(v.number()),
    matchLabel: v.optional(v.string()),
    matchReasons: v.optional(v.array(v.string())),
    missingSkills: v.optional(v.array(v.string())),
    keyStrenghts: v.optional(v.array(v.string())),
    batchIndex: v.number(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId", "batchIndex"])
    .index("by_user_job", ["userId", "jobId"]),

  userJobInteractions: defineTable({
    userId: v.id("users"),
    jobId: v.string(),
    action: v.union(
      v.literal("liked"),
      v.literal("applied"),
      v.literal("hidden")
    ),
    cachedJobData: v.optional(cachedJobData),
    timestamp: v.number(),
  })
    .index("by_user_job", ["userId", "jobId"])
    .index("by_user_action", ["userId", "action"]),

  applications: defineTable({
    userId: v.id("users"),
    jobId: v.string(),
    jobTitle: v.string(),
    companyName: v.string(),
    jobUrl: v.optional(v.string()),
    status: v.union(
      v.literal("saved"),
      v.literal("applied"),
      v.literal("interviewing"),
      v.literal("offered"),
      v.literal("rejected"),
      v.literal("withdrawn")
    ),
    notes: v.optional(v.string()),
    appliedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId", "updatedAt"])
    .index("by_user_status", ["userId", "status"]),

  jobChatThreads: defineTable({
    userId: v.id("users"),
    jobId: v.string(),
    agentThreadId: v.string(),
    jobContext: jobContextValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_job", ["userId", "jobId"])
    .index("by_agent_thread", ["agentThreadId"]),

  // Lightweight, display-only transcript of the per-job AI coach. The agent
  // component keeps its own message store for LLM context; this table powers
  // history rehydration in the UI without coupling to the agent internals.
  jobChatMessages: defineTable({
    userId: v.id("users"),
    jobId: v.string(),
    agentThreadId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_thread", ["agentThreadId", "createdAt"])
    .index("by_user_job", ["userId", "jobId", "createdAt"]),

  usageRecords: defineTable({
    userId: v.id("users"),
    feature: v.union(
      v.literal("job_search"),
      v.literal("resume_analyze"),
      v.literal("resume_generate"),
      v.literal("job_chat")
    ),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_user_feature", ["userId", "feature", "createdAt"]),
});
