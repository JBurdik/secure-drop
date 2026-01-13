import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSession } from "./auth";

export const createFolder = mutation({
  args: {
    spaceId: v.id("spaces"),
    name: v.string(),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?._id ? String(user._id) : undefined;

    const space = await ctx.db.get(args.spaceId);
    if (!space) throw new Error("Space not found");

    const folderId = await ctx.db.insert("folders", {
      spaceId: args.spaceId,
      name: args.name,
      positionX: args.positionX,
      positionY: args.positionY,
      createdBy: userId,
    });

    return folderId;
  },
});

export const updateFolderPosition = mutation({
  args: {
    folderId: v.id("folders"),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      positionX: args.positionX,
      positionY: args.positionY,
    });
  },
});

export const renameFolder = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      name: args.name,
    });
  },
});

export const deleteFolder = mutation({
  args: {
    folderId: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");

    // Move all files in this folder back to canvas (remove folderId)
    const filesInFolder = await ctx.db
      .query("files")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.folderId))
      .collect();

    for (const file of filesInFolder) {
      await ctx.db.patch(file._id, {
        folderId: undefined,
        positionX: folder.positionX + 20,
        positionY: folder.positionY + 20,
      });
    }

    await ctx.db.delete(args.folderId);
  },
});

export const getFolderFiles = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.folderId))
      .collect();

    return Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          _id: file._id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          url,
        };
      }),
    );
  },
});

export const moveFileToFolder = mutation({
  args: {
    fileId: v.id("files"),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      folderId: args.folderId,
    });
  },
});
