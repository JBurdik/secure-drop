import { query } from "./_generated/server";
import { components } from "./_generated/api";

// Check what's in the betterAuth component tables
export const checkBetterAuthTables = query({
  args: {},
  handler: async (ctx) => {
    const paginationOpts = { cursor: null, numItems: 10 };

    // Check users in betterAuth component
    const usersResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts,
    });

    // Check sessions in betterAuth component
    const sessionsResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "session",
      paginationOpts,
    });

    // Check accounts in betterAuth component
    const accountsResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "account",
      paginationOpts,
    });

    return {
      usersCount: usersResult.page.length,
      users: usersResult.page.map((u: { _id: string; email?: string; name?: string }) => ({
        id: u._id,
        email: u.email,
        name: u.name,
      })),
      sessionsCount: sessionsResult.page.length,
      sessions: sessionsResult.page.map((s: { _id: string; userId?: string; expiresAt?: number }) => ({
        id: s._id,
        userId: s.userId,
        expiresAt: s.expiresAt,
        expired: s.expiresAt ? s.expiresAt < Date.now() : false,
      })),
      accountsCount: accountsResult.page.length,
    };
  },
});
