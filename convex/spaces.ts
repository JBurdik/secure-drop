import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateSpaceId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const createSpace = mutation({
  args: {
    name: v.string(),
    allowUploads: v.boolean(),
    expiresIn: v.number(),
  },
  handler: async (ctx, args) => {
    // Max 7 days expiration
    const maxExpiration = 7 * DAY;
    const expiresIn = Math.min(args.expiresIn, maxExpiration);

    const spaceId = generateSpaceId();
    const expiresAt = Date.now() + expiresIn;

    const id = await ctx.db.insert("spaces", {
      spaceId,
      name: args.name,
      createdBy: undefined,
      expiresAt,
      allowUploads: args.allowUploads,
    });

    return { id, spaceId };
  },
});

export const getSpace = query({
  args: { spaceId: v.string() },
  handler: async (ctx, args) => {
    const space = await ctx.db
      .query("spaces")
      .withIndex("by_spaceId", (q) => q.eq("spaceId", args.spaceId))
      .first();

    if (!space) return null;
    if (space.expiresAt < Date.now()) return null;

    return {
      _id: space._id,
      spaceId: space.spaceId,
      name: space.name,
      expiresAt: space.expiresAt,
      allowUploads: space.allowUploads,
      isOwner: false, // Ownership is handled by localStorage on client
    };
  },
});

export const getSpaceFiles = query({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_spaceId", (q) => q.eq("spaceId", args.spaceId))
      .collect();

    return Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          _id: file._id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          positionX: file.positionX ?? 100,
          positionY: file.positionY ?? 100,
          url,
        };
      }),
    );
  },
});

export const updateFilePosition = mutation({
  args: {
    fileId: v.id("files"),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      positionX: args.positionX,
      positionY: args.positionY,
    });
  },
});

export const getUserSpaces = query({
  args: {},
  handler: async () => {
    // No auth - return empty array (spaces are tracked in localStorage)
    return [];
  },
});

export const deleteSpace = mutation({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, args) => {
    const space = await ctx.db.get(args.spaceId);

    if (!space) throw new Error("Space not found");

    // Delete all files in space
    const files = await ctx.db
      .query("files")
      .withIndex("by_spaceId", (q) => q.eq("spaceId", args.spaceId))
      .collect();

    for (const file of files) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }

    await ctx.db.delete(args.spaceId);
  },
});

export const updateSpace = mutation({
  args: {
    spaceId: v.id("spaces"),
    name: v.optional(v.string()),
    allowUploads: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const space = await ctx.db.get(args.spaceId);

    if (!space) throw new Error("Space not found");

    const updates: { name?: string; allowUploads?: boolean } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.allowUploads !== undefined)
      updates.allowUploads = args.allowUploads;

    await ctx.db.patch(args.spaceId, updates);
  },
});
