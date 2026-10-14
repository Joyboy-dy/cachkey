import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end tests of the critical journeys, against a running stack:
 * web (E2E_BASE_URL, default http://localhost:3000) and Mailpit (E2E_MAILPIT_URL).
 * Locally: `bun run services:up && bun run dev`, then `bun run e2e`.
 */

export default defineConfig({
  testDir: "./tests",
  // `*.e2e.ts` keeps these files out of `bun test`.
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
