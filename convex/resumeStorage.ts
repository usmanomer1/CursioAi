import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { rateLimiter } from "./lib/limits";
import { resumeLinksValidator } from "./lib/pdf/resumeLinks";

const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10 MB

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "resumeUpload", {
      key: user._id,
    });
    if (!ok) {
      throw new Error(
        `Too many uploads. Try again in ${Math.ceil(
          (retryAfter ?? 0) / 1000
        )} seconds.`
      );
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveUploadedResume = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    resumeText: v.string(),
    resumeLinks: v.optional(resumeLinksValidator),
  },
  returns: v.id("resumes"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();

    // Validate the just-uploaded blob is a sane PDF before linking it.
    const meta = await ctx.db.system.get(args.storageId);
    if (!meta) throw new Error("Uploaded file not found");
    if (meta.size > MAX_RESUME_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Resume file is too large (max 10 MB).");
    }
    if (meta.contentType && meta.contentType !== "application/pdf") {
      await ctx.storage.delete(args.storageId);
      throw new Error("Resume must be a PDF.");
    }

    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();

    if (existing) {
      if (existing.storageId) {
        await ctx.storage.delete(existing.storageId);
      }
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        fileName: args.fileName,
        resumeText: args.resumeText,
        resumeLinks: args.resumeLinks,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("resumes", {
      userId: user._id,
      storageId: args.storageId,
      fileName: args.fileName,
      resumeText: args.resumeText,
      resumeLinks: args.resumeLinks,
      isPrimary: true,
      updatedAt: now,
    });
  },
});

export const getResumeDownloadUrl = query({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== user._id) {
      throw new Error("Resume not found");
    }
    if (!resume.storageId) return null;
    return await ctx.storage.getUrl(resume.storageId);
  },
});

export const getGenerationDownloadUrl = query({
  args: { generationId: v.id("resumeGenerations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const gen = await ctx.db.get(args.generationId);
    if (!gen || gen.userId !== user._id) {
      throw new Error("Generation not found");
    }
    if (!gen.storageId) return null;
    return await ctx.storage.getUrl(gen.storageId);
  },
});
