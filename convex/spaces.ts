import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSession } from "./auth";

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
    const user = await getSession(ctx);
    const userId = user?.userId ?? undefined;

    // Authenticated users can have up to 7 days, anonymous up to 24h
    const maxExpiration = userId ? 7 * DAY : DAY;
    const expiresIn = Math.min(args.expiresIn, maxExpiration);

    const spaceId = generateSpaceId();
    const expiresAt = Date.now() + expiresIn;

    const id = await ctx.db.insert("spaces", {
      spaceId,
      name: args.name,
      createdBy: userId,
      expiresAt,
      allowUploads: args.allowUploads,
    });

    return { id, spaceId };
  },
});

export const getSpace = query({
  args: { spaceId: v.string() },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.userId ?? undefined;

    const space = await ctx.db
      .query("spaces")
      .withIndex("by_spaceId", (q) => q.eq("spaceId", args.spaceId))
      .first();

    if (!space) return null;
    if (space.expiresAt < Date.now()) return null;

    // Check ownership - either logged in user created it or anonymous (localStorage check on client)
    const isOwner = userId ? space.createdBy === userId : false;

    return {
      _id: space._id,
      spaceId: space.spaceId,
      name: space.name,
      expiresAt: space.expiresAt,
      allowUploads: space.allowUploads,
      isOwner,
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
  handler: async (ctx) => {
    const user = await getSession(ctx);
    const userId = user?.userId ?? undefined;

    if (!userId) return [];

    const spaces = await ctx.db
      .query("spaces")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
      .collect();

    // Filter out expired spaces
    const now = Date.now();
    return spaces
      .filter((s) => s.expiresAt > now)
      .map((s) => ({
        _id: s._id,
        spaceId: s.spaceId,
        name: s.name,
        expiresAt: s.expiresAt,
        allowUploads: s.allowUploads,
      }));
  },
});

export const deleteSpace = mutation({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.userId ?? undefined;

    const space = await ctx.db.get(args.spaceId);

    if (!space) throw new Error("Space not found");

    // Only owner can delete (or anonymous spaces can be deleted via localStorage check on client)
    if (space.createdBy && space.createdBy !== userId) {
      throw new Error("Not authorized");
    }

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
    const user = await getSession(ctx);
    const userId = user?.userId ?? undefined;

    const space = await ctx.db.get(args.spaceId);

    if (!space) throw new Error("Space not found");

    // Only owner can update (or anonymous spaces can be updated via localStorage check on client)
    if (space.createdBy && space.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    const updates: { name?: string; allowUploads?: boolean } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.allowUploads !== undefined)
      updates.allowUploads = args.allowUploads;

    await ctx.db.patch(args.spaceId, updates);
  },
});
