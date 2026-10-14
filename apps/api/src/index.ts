import type { PublicConfig } from "@cachkey/shared";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { accountRoutes } from "./account";
import { auth, enabledSocialProviders } from "./auth";
import { dashboardRoutes } from "./dashboard";
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
      // Absolute: the default (« api/v1/docs/json ») resolves under /api/v1/docs/ in the browser.
      specPath: "/api/v1/docs/json",
      // Scalar's open-source viewer only (MIT): no links to its paid cloud services, no AI,
      // no telemetry. Version pinned rather than « latest ».
      scalar: {
        url: "/api/v1/docs/json",
        version: "1.74.0",
        showDeveloperTools: "never",
        showToolbar: "never",
        hideClientButton: true,
        telemetry: false,
        mcp: { disabled: true },
        agent: { disabled: true },
      },
      exclude: { paths: [/^\/api\/(?!v1\/)/, /^\/api\/v1\/docs/] },
      documentation: {
        info: {
          title: "Cachkey API",
          version: "1.0.0",
          description:
            "Read the variables of an environment from a server, a script or a CI job. Create a service token in the project settings, then send it as `Authorization: Bearer ck_…`.",
        },
        // Public address of this instance, so the examples are ready to copy.
        servers: [{ url: env.APP_URL }],
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
  .use(dashboardRoutes)
  .use(secretRoutes)
  .use(tokenRoutes)
  .use(publicApiRoutes)
  .get("/api/health", () => ({ status: "ok" }))
  .get("/api/config", (): PublicConfig => ({ socialProviders: enabledSocialProviders }))
  .listen(env.API_PORT);

console.info(`Cachkey API listening on http://localhost:${env.API_PORT}`);

export type App = typeof app;
