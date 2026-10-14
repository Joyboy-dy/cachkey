import type { PublicConfig } from "@cachkey/shared";
import { Elysia } from "elysia";
import { auth, enabledSocialProviders } from "./auth";
import { env } from "./env";

export const app = new Elysia()
  // Better Auth handles every route under /api/auth/*.
  .mount(auth.handler)
  .get("/api/health", () => ({ status: "ok" }))
  .get("/api/config", (): PublicConfig => ({ socialProviders: enabledSocialProviders }))
  .listen(env.API_PORT);

console.info(`Cachkey API listening on http://localhost:${env.API_PORT}`);

export type App = typeof app;
