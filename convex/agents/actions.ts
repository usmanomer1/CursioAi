"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  getJobAdvisorAgent,
  buildJobContextPrompt,
} from "../agents/jobAdvisor";
import { assertPaidPlan } from "../lib/billing";

export const createJobChatThread = action({
  args: {
    jobId: v.string(),
    jobContext: v.object({
      title: v.string(),
      company: v.string(),
      description: v.string(),
      matchScore: v.optional(v.number()),
      missingSkills: v.optional(v.array(v.string())),
      resumeText: v.optional(v.string()),
    }),
  },
  returns: v.object({
    threadId: v.string(),
    chatRecordId: v.id("jobChatThreads"),
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
      feature: "job_chat",
    });

    const jobAdvisorAgent = getJobAdvisorAgent();
    const { threadId }: { threadId: string } = await jobAdvisorAgent.createThread(ctx, {
      userId: user._id,
      title: `${args.jobContext.title} at ${args.jobContext.company}`,
    });

    const contextPrompt = buildJobContextPrompt(args.jobContext);
    await jobAdvisorAgent.saveMessage(ctx, {
      threadId,
      message: {
        role: "system",
        content: contextPrompt,
      },
      skipEmbeddings: true,
    });

    const chatRecordId: Id<"jobChatThreads"> = await ctx.runMutation(
      internal.jobChatInternal.saveThread,
      {
        userId: user._id,
        jobId: args.jobId,
        agentThreadId: threadId,
        jobContext: args.jobContext,
      }
    );

    return { threadId, chatRecordId };
  },
});

export const sendJobChatMessage = action({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  returns: v.object({
    text: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    assertPaidPlan(identity);

    const user = await ctx.runQuery(internal.usersInternal.getByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    // Verify this user actually owns the thread before continuing it —
    // otherwise any authenticated caller could read/inject into another
    // user's coaching thread (which embeds their resume + job context).
    const ownerThread = await ctx.runQuery(
      internal.jobChatInternal.getThreadByAgentThreadId,
      { agentThreadId: args.threadId }
    );
    if (!ownerThread || ownerThread.userId !== user._id) {
      throw new Error("Chat thread not found");
    }

    await ctx.runMutation(internal.gating.assertCanUseAi, {
      userId: user._id,
      feature: "job_chat",
    });

    const jobAdvisorAgent = getJobAdvisorAgent();
    const { thread } = await jobAdvisorAgent.continueThread(ctx, {
      threadId: args.threadId,
    });

    const result = await thread.generateText({
      prompt: args.message,
    });

    // Persist a display-only transcript so reopening the coach restores history.
    await ctx.runMutation(internal.jobChatInternal.saveChatMessages, {
      userId: user._id,
      jobId: ownerThread.jobId,
      agentThreadId: args.threadId,
      userMessage: args.message,
      assistantMessage: result.text,
    });

    await ctx.runMutation(internal.usersInternal.trackUsage, {
      userId: user._id,
      feature: "job_chat" as const,
      metadata: { threadId: args.threadId },
    });

    return { text: result.text };
  },
});
