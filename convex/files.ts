import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSession } from "./auth";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

    // Check file size limit
    if (args.size > MAX_FILE_SIZE) {
      throw new Error("File too large. Maximum size is 500MB.");
    }

    // Check space exists and is not expired
    const space = await ctx.db.get(args.spaceId);
    if (!space) throw new Error("Space not found");
    if (space.expiresAt !== 0 && space.expiresAt < Date.now()) {
      throw new Error("Space has expired");
    }

    // Check upload permissions
    const isOwner = userId && space.createdBy === userId;

    // Owner can always upload
    if (!isOwner) {
      // Check if uploads are allowed
      if (!space.allowUploads) {
        throw new Error("Uploads not allowed in this space");
      }

      // Check if auth is required for uploads
      if (space.requireAuthForUpload && !userId) {
        throw new Error("You must be logged in to upload to this space");
      }
    }

    // Use space expiration for file, or far future for infinite spaces
    const fileExpiresAt =
      space.expiresAt === 0
        ? Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year for infinite spaces
        : space.expiresAt;

    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      size: args.size,
      mimeType: args.mimeType,
      spaceId: args.spaceId,
      folderId: args.folderId,
      positionX: args.positionX,
      positionY: args.positionY,
      expiresAt: fileExpiresAt,
      uploadedBy: userId,
    });

    return { fileId };
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

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

export const deleteFiles = mutation({
  args: { fileIds: v.array(v.id("files")) },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

    for (const fileId of args.fileIds) {
      const file = await ctx.db.get(fileId);
      if (!file) continue;

      if (!file.spaceId) continue;
      const space = await ctx.db.get(file.spaceId);
      if (!space) continue;

      // Check if current user is space owner
      if (space.createdBy && space.createdBy !== userId) {
        continue; // Skip files user doesn't own
      }

      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(fileId);
    }
  },
});

export const moveFilesToFolder = mutation({
  args: {
    fileIds: v.array(v.id("files")),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

    for (const fileId of args.fileIds) {
      const file = await ctx.db.get(fileId);
      if (!file) continue;

      if (!file.spaceId) continue;
      const space = await ctx.db.get(file.spaceId);
      if (!space) continue;

      // Check if current user is space owner
      if (space.createdBy && space.createdBy !== userId) {
        continue; // Skip files user doesn't own
      }

      await ctx.db.patch(fileId, { folderId: args.folderId });
    }
  },
});
