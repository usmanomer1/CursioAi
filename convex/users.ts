import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getOptionalUser } from "./lib/auth";

export const syncUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name ?? existing.name,
        avatarUrl: args.avatarUrl ?? existing.avatarUrl,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const completeOnboarding = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, {
      onboardingComplete: true,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    // Tolerant of the brief window before the client-side UserSync has created
    // the users row — returns nulls instead of throwing so the UI can show a
    // "setting up" state and recover reactively once the row exists.
    const user = await getOptionalUser(ctx);
    if (!user) return { user: null, profile: null, primaryResume: null };
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const primaryResume = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();

    return { user, profile, primaryResume };
  },
});

export const upsertProfile = mutation({
  args: {
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
  },
  returns: v.id("profiles"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      userId: user._id,
      ...args,
      updatedAt: now,
    });
  },
});

export const saveResumeText = mutation({
  args: {
    resumeText: v.string(),
    fileName: v.optional(v.string()),
  },
  returns: v.id("resumes"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();

    if (existing) {
      // Pasted text replaces whatever was there. If an uploaded PDF was
      // attached, it no longer matches the text — drop the stale file so
      // downloads can't serve a resume that doesn't match the stored text.
      if (existing.storageId && !args.fileName) {
        await ctx.storage.delete(existing.storageId);
      }
      await ctx.db.patch(existing._id, {
        resumeText: args.resumeText,
        fileName: args.fileName ?? (existing.storageId ? undefined : existing.fileName),
        storageId: args.fileName ? existing.storageId : undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("resumes", {
      userId: user._id,
      resumeText: args.resumeText,
      fileName: args.fileName,
      isPrimary: true,
      updatedAt: now,
    });
  },
});
