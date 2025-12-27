import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSession } from "./auth";

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
    const user = await getSession(ctx);
    const userId = user?.userId ?? undefined;

    // Check space exists and allows uploads
    const space = await ctx.db.get(args.spaceId);
    if (!space) throw new Error("Space not found");
    if (space.expiresAt < Date.now()) throw new Error("Space has expired");

    // Check if current user is owner or if uploads are allowed
    const isOwner = userId && space.createdBy === userId;

    if (!isOwner && !space.allowUploads) {
      throw new Error("Uploads not allowed in this space");
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
    const user = await getSession(ctx);
    const userId = user?.userId ?? undefined;

    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");

    if (!file.spaceId) throw new Error("Legacy file - no space");
    const space = await ctx.db.get(file.spaceId);
    if (!space) throw new Error("Space not found");

    // Check if current user is space owner
    // For anonymous spaces (no createdBy), allow deletion via client-side localStorage check
    if (space.createdBy && space.createdBy !== userId) {
      throw new Error("Not authorized");
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
