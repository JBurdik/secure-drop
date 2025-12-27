import type { AuthConfig } from "convex/server";

const authDomain =
  process.env.SITE_URL || "https://site.secure-drop.burdych.net";

export default {
  providers: [
    {
      domain: authDomain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
