import { createAuthClient } from "better-auth/react";

/** Better Auth client — calls go to the same origin (/api/auth/*), proxied to the API. */
export const authClient = createAuthClient({
  basePath: "/api/auth",
});
