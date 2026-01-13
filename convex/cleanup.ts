import { internalMutation, mutation } from "./_generated/server";

// Cleanup expired spaces and their files
export const cleanupExpiredSpaces = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all expired spaces (expiresAt !== 0 means it has expiration)
    const expiredSpaces = await ctx.db
      .query("spaces")
      .withIndex("by_expiresAt")
      .filter((q) =>
        q.and(
          q.neq(q.field("expiresAt"), 0), // Not infinite
          q.lt(q.field("expiresAt"), now), // Expired
        ),
      )
      .collect();

    let deletedSpaces = 0;
    let deletedFiles = 0;
    let deletedFolders = 0;

    for (const space of expiredSpaces) {
      // Delete all files in the space
      const files = await ctx.db
        .query("files")
        .withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
        .collect();

      for (const file of files) {
        await ctx.storage.delete(file.storageId);
        await ctx.db.delete(file._id);
        deletedFiles++;
      }

      // Delete all folders in the space
      const folders = await ctx.db
        .query("folders")
        .withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
        .collect();

      for (const folder of folders) {
        await ctx.db.delete(folder._id);
        deletedFolders++;
      }

      // Delete the space
      await ctx.db.delete(space._id);
      deletedSpaces++;
    }

    // Also cleanup orphaned files (files with expired expiresAt but no space)
    const expiredFiles = await ctx.db
      .query("files")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const file of expiredFiles) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
      deletedFiles++;
    }

    return {
      deletedSpaces,
      deletedFiles,
      deletedFolders,
    };
  },
});

// Delete legacy auth tables that are no longer used
// These are from @convex-dev/auth which was replaced by @convex-dev/better-auth
export const deleteLegacyAuthTables = mutation({
  args: {},
  handler: async (ctx) => {
    const legacyTables = [
      "authAccounts",
      "authRateLimits",
      "authRefreshTokens",
      "authSessions",
      "authVerificationCodes",
      "authVerifiers",
      "presence",
      "users",
    ];

    const results: Record<string, number> = {};

    for (const tableName of legacyTables) {
      let count = 0;
      try {
        // Query all documents from the table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const docs = await (ctx.db as any).query(tableName).collect();
        for (const doc of docs) {
          await ctx.db.delete(doc._id);
          count++;
        }
      } catch {
        // Table might not exist or be empty
      }
      results[tableName] = count;
    }

    return results;
  },
});
