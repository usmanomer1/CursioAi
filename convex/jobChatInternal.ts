import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { jobContextValidator } from "./lib/validators";

export const getThreadByAgentThreadId = internalQuery({
  args: { agentThreadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobChatThreads")
      .withIndex("by_agent_thread", (q) =>
        q.eq("agentThreadId", args.agentThreadId)
      )
      .unique();
  },
});

export const saveChatMessages = internalMutation({
  args: {
    userId: v.id("users"),
    jobId: v.string(),
    agentThreadId: v.string(),
    userMessage: v.string(),
    assistantMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("jobChatMessages", {
      userId: args.userId,
      jobId: args.jobId,
      agentThreadId: args.agentThreadId,
      role: "user",
      content: args.userMessage,
      createdAt: now,
    });
    await ctx.db.insert("jobChatMessages", {
      userId: args.userId,
      jobId: args.jobId,
      agentThreadId: args.agentThreadId,
      role: "assistant",
      content: args.assistantMessage,
      createdAt: now + 1,
    });
    return null;
  },
});

export const saveThread = internalMutation({
  args: {
    userId: v.id("users"),
    jobId: v.string(),
    agentThreadId: v.string(),
    jobContext: jobContextValidator,
  },
  returns: v.id("jobChatThreads"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("jobChatThreads")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", args.userId).eq("jobId", args.jobId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        agentThreadId: args.agentThreadId,
        jobContext: args.jobContext,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("jobChatThreads", {
      userId: args.userId,
      jobId: args.jobId,
      agentThreadId: args.agentThreadId,
      jobContext: args.jobContext,
      createdAt: now,
      updatedAt: now,
    });
  },
});
