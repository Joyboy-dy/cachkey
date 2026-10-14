import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Better Auth client — calls go to the same origin (/api/auth/*), proxied to the API. */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    // Mirrors `user.additionalFields` in apps/api/src/auth.ts.
    inferAdditionalFields({
      user: {
        avatarSeed: { type: "string", required: false },
      },
    }),
  ],
});
