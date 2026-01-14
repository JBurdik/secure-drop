import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSession, authComponent } from "./auth";

// Debug query to check auth status
export const debugAuth = query({
  args: {},
  handler: async (ctx) => {
    // Step 1: Check if JWT identity is present (token validation)
    const identity = await ctx.auth.getUserIdentity();

    // Step 2: Try to get user from betterAuth component
    let user = null;
    let authError = null;
    try {
      user = await authComponent.getAuthUser(ctx);
    } catch (e) {
      authError = e instanceof Error ? e.message : String(e);
    }

    // Step 3: Check all spaces in DB
    const allSpaces = await ctx.db.query("spaces").collect();

    // The consistent user ID (identity.subject) should be used for matching
    const consistentUserId = identity?.subject ?? null;
    const stringifiedUserId = user?._id ? String(user._id) : null;

    // Check which spaces belong to this user
    const userSpaces = allSpaces.filter(
      (s) => s.createdBy === consistentUserId || s.createdBy === stringifiedUserId
    );

    const spacesInfo = allSpaces.map((s) => ({
      id: s._id,
      spaceId: s.spaceId,
      createdBy: s.createdBy,
      matchesConsistentId: s.createdBy === consistentUserId,
      matchesStringifiedId: s.createdBy === stringifiedUserId,
    }));

    return {
      // JWT validation
      step1_hasIdentity: !!identity,
      step1_identitySubject: consistentUserId,
      step1_identitySessionId: (identity as { sessionId?: string })?.sessionId ?? null,

      // User lookup
      step2_hasUser: !!user,
      step2_stringifiedUserId: stringifiedUserId,
      step2_userEmail: (user as { email?: string })?.email ?? null,
      step2_authError: authError,

      // ID comparison - these should match!
      step2_idsMatch: consistentUserId === stringifiedUserId,

      // Spaces info
      step3_totalSpaces: allSpaces.length,
      step3_userSpacesCount: userSpaces.length,
      step3_spaces: spacesInfo,
    };
  },
});

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

// Limits
const ANON_MAX_SPACES = 3;
const ANON_MAX_EXPIRATION = 3 * HOUR; // 3 hours for anonymous
const AUTH_MAX_SPACES = 5;
const AUTH_MAX_EXPIRATION = 7 * DAY; // 7 days for authenticated (or infinite)

export const createSpace = mutation({
  args: {
    name: v.string(),
    allowUploads: v.boolean(),
    requireAuthForUpload: v.optional(v.boolean()),
    expiresIn: v.optional(v.number()), // undefined = infinite (auth only)
  },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

    // Check space limit
    if (userId) {
      const existingSpaces = await ctx.db
        .query("spaces")
        .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
        .collect();

      const activeSpaces = existingSpaces.filter(
        (s) => s.expiresAt === 0 || s.expiresAt > Date.now(),
      );
      if (activeSpaces.length >= AUTH_MAX_SPACES) {
        throw new Error(
          `You can only have ${AUTH_MAX_SPACES} active spaces. Delete one to create a new one.`,
        );
      }

      // Check if user already has an infinite space
      const hasInfinite = activeSpaces.some((s) => s.expiresAt === 0);
      if (!args.expiresIn && hasInfinite) {
        throw new Error(
          "You can only have 1 infinite space. Choose an expiration time.",
        );
      }
    }

    // Check if user wants infinite expiration (expiresIn is undefined)
    const wantsInfinite = args.expiresIn === undefined;

    // Only authenticated users can have infinite spaces
    const isInfinite = wantsInfinite && userId;

    // Set expiration limits based on auth status
    let expiresAt: number;
    if (isInfinite) {
      expiresAt = 0; // 0 means infinite
    } else {
      const maxExpiration = userId ? AUTH_MAX_EXPIRATION : ANON_MAX_EXPIRATION;
      // If user wanted infinite but isn't authenticated, use their max expiration
      const defaultExpiration = userId ? AUTH_MAX_EXPIRATION : ANON_MAX_EXPIRATION;
      const expiresIn = Math.min(
        args.expiresIn ?? defaultExpiration,
        maxExpiration,
      );
      expiresAt = Date.now() + expiresIn;
    }

    const spaceId = generateSpaceId();

    const id = await ctx.db.insert("spaces", {
      spaceId,
      name: args.name,
      createdBy: userId,
      expiresAt,
      allowUploads: args.allowUploads,
      requireAuthForUpload: args.requireAuthForUpload ?? false,
    });

    return { id, spaceId, isAuthenticated: !!userId };
  },
});

export const getSpace = query({
  args: { spaceId: v.string() },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

    const space = await ctx.db
      .query("spaces")
      .withIndex("by_spaceId", (q) => q.eq("spaceId", args.spaceId))
      .first();

    if (!space) return null;
    // expiresAt === 0 means infinite
    if (space.expiresAt !== 0 && space.expiresAt < Date.now()) return null;

    // Check ownership
    const isOwner = userId ? space.createdBy === userId : false;

    // Get folders for this space
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
      .collect();

    return {
      _id: space._id,
      spaceId: space.spaceId,
      name: space.name,
      expiresAt: space.expiresAt,
      allowUploads: space.allowUploads,
      requireAuthForUpload: space.requireAuthForUpload ?? false,
      isOwner,
      isAuthenticated: !!userId,
      folders: folders.map((f) => ({
        _id: f._id,
        name: f.name,
        positionX: f.positionX,
        positionY: f.positionY,
        color: f.color,
        icon: f.icon,
      })),
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
          folderId: file.folderId,
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
    const userId = user?.consistentUserId;

    if (!userId) return [];

    // Query spaces by consistent user ID
    let spaces = await ctx.db
      .query("spaces")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
      .collect();

    // Fallback: also check with String(user._id) format for backwards compatibility
    if (spaces.length === 0 && user?._id) {
      const legacyUserId = String(user._id);
      if (legacyUserId !== userId) {
        spaces = await ctx.db
          .query("spaces")
          .withIndex("by_createdBy", (q) => q.eq("createdBy", legacyUserId))
          .collect();
      }
    }

    // Filter out expired spaces (expiresAt === 0 means infinite)
    const now = Date.now();
    return spaces
      .filter((s) => s.expiresAt === 0 || s.expiresAt > now)
      .map((s) => ({
        _id: s._id,
        spaceId: s.spaceId,
        name: s.name,
        expiresAt: s.expiresAt,
        allowUploads: s.allowUploads,
      }));
  },
});

export const getUserSpaceCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

    if (!userId) {
      return {
        count: 0,
        max: ANON_MAX_SPACES,
        isAuthenticated: false,
        hasInfinite: false,
      };
    }

    const spaces = await ctx.db
      .query("spaces")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
      .collect();

    const now = Date.now();
    const activeSpaces = spaces.filter(
      (s) => s.expiresAt === 0 || s.expiresAt > now,
    );
    const hasInfinite = activeSpaces.some((s) => s.expiresAt === 0);

    return {
      count: activeSpaces.length,
      max: AUTH_MAX_SPACES,
      isAuthenticated: true,
      hasInfinite,
    };
  },
});

export const deleteSpace = mutation({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

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

    // Delete all folders in space
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_spaceId", (q) => q.eq("spaceId", args.spaceId))
      .collect();

    for (const folder of folders) {
      await ctx.db.delete(folder._id);
    }

    await ctx.db.delete(args.spaceId);
  },
});

export const updateSpace = mutation({
  args: {
    spaceId: v.id("spaces"),
    name: v.optional(v.string()),
    allowUploads: v.optional(v.boolean()),
    requireAuthForUpload: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getSession(ctx);
    const userId = user?.consistentUserId;

    const space = await ctx.db.get(args.spaceId);

    if (!space) throw new Error("Space not found");

    // Only owner can update (or anonymous spaces can be updated via localStorage check on client)
    if (space.createdBy && space.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    const updates: {
      name?: string;
      allowUploads?: boolean;
      requireAuthForUpload?: boolean;
    } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.allowUploads !== undefined)
      updates.allowUploads = args.allowUploads;
    if (args.requireAuthForUpload !== undefined)
      updates.requireAuthForUpload = args.requireAuthForUpload;

    await ctx.db.patch(args.spaceId, updates);
  },
});
