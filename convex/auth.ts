import { betterAuth } from "better-auth";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import authConfig from "./auth.config";
import { crossDomain } from "./patches/crossDomain";

const siteUrl = process.env.SITE_URL || "http://localhost:5173";
const convexUrl = process.env.CONVEX_SITE_URL || "http://localhost:3211";
const authSecret =
  process.env.BETTER_AUTH_SECRET || "development-secret-change-in-production";

const trustedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://secure-drop.burdych.net",
  "https://convex.secure-drop.burdych.net",
  "https://local-secure-drop.burdych.net",
  siteUrl,
].filter((origin) => origin && origin.length > 0);

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) =>
  betterAuth({
    secret: authSecret,
    baseURL: convexUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    trustedOrigins,
    plugins: [
      convex({ authConfig, options: { trustedOrigins } }),
      crossDomain({ siteUrl, trustedOrigins }),
    ],
    logger: { disabled: optionsOnly },
  });

// Helper to get session in mutations/queries - returns null if not authenticated
export const getSession = async (ctx: GenericCtx<DataModel>) => {
  try {
    return await authComponent.getAuthUser(ctx);
  } catch {
    return null;
  }
};
