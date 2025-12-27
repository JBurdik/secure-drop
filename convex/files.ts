import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadFile = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    size: v.number(),
    mimeType: v.string(),
    spaceId: v.id("spaces"),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, args) => {
    // Check space exists and allows uploads
    const space = await ctx.db.get(args.spaceId);
    if (!space) throw new Error("Space not found");
    if (space.expiresAt < Date.now()) throw new Error("Space has expired");

    // Check if current user is owner or if uploads are allowed
    const identity = await ctx.auth.getUserIdentity();
    let isOwner = false;

    if (identity && space.createdBy) {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), identity.email))
        .first();
      isOwner = user?._id === space.createdBy;
    }

    if (!isOwner && !space.allowUploads) {
      throw new Error("Uploads not allowed in this space");
    }

    let userId: Id<"users"> | undefined;
    if (identity) {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), identity.email))
        .first();
      userId = user?._id;
    }

    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      size: args.size,
      mimeType: args.mimeType,
      spaceId: args.spaceId,
      positionX: args.positionX,
      positionY: args.positionY,
      expiresAt: space.expiresAt,
      uploadedBy: userId,
    });

    return { fileId };
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");

    if (!file.spaceId) throw new Error("Legacy file - no space");
    const space = await ctx.db.get(file.spaceId);
    if (!space) throw new Error("Space not found");

    // Check if current user is space owner
    const identity = await ctx.auth.getUserIdentity();

    if (space.createdBy) {
      if (!identity) throw new Error("Not authenticated");

      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), identity.email))
        .first();

      if (!user || user._id !== space.createdBy) {
        throw new Error("Not authorized");
      }
    }

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
  },
});

export const getFileUrl = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return null;

    return await ctx.storage.getUrl(file.storageId);
  },
});
