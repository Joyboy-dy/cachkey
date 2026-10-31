import {
  deviceAuthorizationClient,
  inferAdditionalFields,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Better Auth client — calls go to the same origin (/api/auth/*), proxied to the API. */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    // Organisations, members and roles (apps/api/src/auth.ts → `organization()`).
    organizationClient(),
    // `cachkey login` approval page (/device).
    deviceAuthorizationClient(),
    // Second factor (apps/api/src/auth.ts → `twoFactor()`); the sign-in page handles the
    // redirection to /two-factor itself.
    twoFactorClient(),
    // Mirrors `user.additionalFields` in apps/api/src/auth.ts.
    inferAdditionalFields({
      user: {
        avatarSeed: { type: "string", required: false },
      },
    }),
  ],
});
