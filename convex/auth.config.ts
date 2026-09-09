import { AuthConfig } from "convex/server";

export default {
  providers: process.env.HERCULES_OIDC_AUTHORITY
    ? [
        {
          domain: process.env.HERCULES_OIDC_AUTHORITY,
          applicationID: process.env.HERCULES_OIDC_CLIENT_ID ?? "",
        },
      ]
    : [],
} satisfies AuthConfig;

