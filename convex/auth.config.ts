import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

// const authDomain =
//   process.env.SITE_URL || "https://site.secure-drop.burdych.net";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
