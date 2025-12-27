import { internalMutation } from "./_generated/server";

export const cleanupExpiredSpaces = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredSpaces = await ctx.db
      .query("spaces")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    let deletedSpaces = 0;
    let deletedFiles = 0;

    for (const space of expiredSpaces) {
      // Delete all files in space
      const files = await ctx.db
        .query("files")
        .withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
        .collect();

      for (const file of files) {
        await ctx.storage.delete(file.storageId);
        await ctx.db.delete(file._id);
        deletedFiles++;
      }

      await ctx.db.delete(space._id);
      deletedSpaces++;
    }

    return { deletedSpaces, deletedFiles };
  },
});
