import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSession } from "./auth";

export const createFolder = mutation({
  args: {
    spaceId: v.id("spaces"),
    name: v.string(),
    positionX: v.number(),
    positionY: v.number(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

    const space = await ctx.db.get(args.spaceId);
    if (!space) throw new Error("Space not found");

    const folderId = await ctx.db.insert("folders", {
      spaceId: args.spaceId,
      name: args.name,
      positionX: args.positionX,
      positionY: args.positionY,
      createdBy: userId,
      color: args.color,
      icon: args.icon,
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

export const updateFolder = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: { name?: string; color?: string; icon?: string } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;
    if (args.icon !== undefined) updates.icon = args.icon;

    await ctx.db.patch(args.folderId, updates);
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

// Create a folder from two files (when dropping file on file)
export const createFolderFromFiles = mutation({
  args: {
    spaceId: v.id("spaces"),
    fileId1: v.id("files"),
    fileId2: v.id("files"),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

    const space = await ctx.db.get(args.spaceId);
    if (!space) throw new Error("Space not found");

    const file1 = await ctx.db.get(args.fileId1);
    const file2 = await ctx.db.get(args.fileId2);

    if (!file1 || !file2) throw new Error("Files not found");

    // Create folder with a default name
    const folderId = await ctx.db.insert("folders", {
      spaceId: args.spaceId,
      name: "New Folder",
      positionX: args.positionX,
      positionY: args.positionY,
      createdBy: userId,
    });

    // Move both files into the folder
    await ctx.db.patch(args.fileId1, { folderId });
    await ctx.db.patch(args.fileId2, { folderId });

    return folderId;
  },
});
