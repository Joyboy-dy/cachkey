import type { PublicConfig } from "@cachkey/shared";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { accountRoutes } from "./account";
import { auth, enabledSocialProviders } from "./auth";
import { env } from "./env";
import { secretRoutes } from "./secrets";
import { publicApiRoutes, tokenRoutes } from "./tokens";
import { workspaceRoutes } from "./workspace";

export const app = new Elysia()
  // Public API reference (Scalar) at /api/v1/docs, spec at /api/v1/docs/json. Only the
  // token-authenticated API is documented: the other routes serve the web app.
  .use(
    openapi({
      path: "/api/v1/docs",
      exclude: { paths: [/^\/api\/(?!v1\/)/, /^\/api\/v1\/docs/] },
      documentation: {
        info: {
          title: "Cachkey API",
          version: "1.0.0",
          description:
            "Read the variables of an environment from a server, a script or a CI job. Create a service token in the project settings, then send it as `Authorization: Bearer ck_…`.",
        },
        components: {
          securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
        },
      },
    }),
  )
  // Better Auth handles every route under /api/auth/*.
  .mount(auth.handler)
  .use(accountRoutes)
  .use(workspaceRoutes)
  .use(secretRoutes)
  .use(tokenRoutes)
  .use(publicApiRoutes)
  .get("/api/health", () => ({ status: "ok" }))
  .get("/api/config", (): PublicConfig => ({ socialProviders: enabledSocialProviders }))
  .listen(env.API_PORT);

console.info(`Cachkey API listening on http://localhost:${env.API_PORT}`);

export type App = typeof app;
