import { expect, test } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { api, BASE_URL, createProject, newOwner, open, required } from "./helpers";

/*
 * The real CLI (apps/cli), run as a subprocess against the running stack, with its own
 * configuration directory so the developer's login is never touched.
 */

const CLI = join(import.meta.dirname, "..", "..", "apps", "cli", "src", "index.ts");

function cliEnv(configDir: string, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, CACHKEY_URL: BASE_URL };
  delete env.CACHKEY_TOKEN;
  return { ...env, CACHKEY_CONFIG_DIR: configDir, ...extra };
}

function cli(args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync("bun", [CLI, ...args], { env, encoding: "utf8", timeout: 30_000 });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

test("CLI connectée par code, jeton d'accès, API publique et révocation", async ({ page }) => {
  await newOwner(page, "cli");
  const slug = await createProject(page, `Projet CLI ${Date.now()}`);
  const session = (await (await api(page).get("/api/auth/get-session")).json()) as {
    session: { activeOrganizationId: string };
  };
  const organizationId = session.session.activeOrganizationId;
  const configDir = mkdtempSync(join(tmpdir(), "cachkey-e2e-"));
  const tokenConfigDir = mkdtempSync(join(tmpdir(), "cachkey-e2e-token-"));
  const env = cliEnv(configDir);

  try {
    // ── cachkey login: code shown in the terminal, approved in the browser ──
    const login = spawn("bun", [CLI, "login", "--no-browser"], { env });
    let stderr = "";
    login.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    const exited = new Promise<number | null>((resolve) => login.on("exit", resolve));
    await expect.poll(() => /Votre code : (\S+)/.exec(stderr)?.[1] ?? null).not.toBeNull();
    const url = required(/(http\S+\/device\S*)/.exec(stderr)?.[1], "adresse de validation");
    const code = required(/Votre code : (\S+)/.exec(stderr)?.[1], "code");

    await open(page, url);
    await expect(page.getByText(code)).toBeVisible();
    await page.getByRole("button", { name: "Autoriser" }).click();
    expect(await exited).toBe(0);
    expect(stderr).toContain("Connecté en tant que Alex Propriétaire");

    // ── Signed in: write and read with the user's rights ──
    const target = ["--org", organizationId, "--project", slug, "--env", "development"];
    expect(cli(["set", "API_URL", "https://api.example.com", ...target], env).code).toBe(0);
    const got = cli(["get", "API_URL", ...target], env);
    expect(got.stdout.trim()).toBe("https://api.example.com");
    const run = cli(["run", ...target, "--", "bun", "-e", "console.log(process.env.API_URL)"], env);
    expect(run.code).toBe(0);
    expect(run.stdout.trim()).toBe("https://api.example.com");

    // ── Access token: read-only, one environment ──
    const environments = (await (
      await api(page).get(`/api/projects/${slug}/environments`)
    ).json()) as { id: string; slug: string }[];
    const development = required(
      environments.find((environment) => environment.slug === "development"),
      "development",
    );
    const created = await api(page).post(`/api/projects/${slug}/tokens`, {
      data: { name: "CI e2e", environmentId: development.id, expiresInDays: 30 },
    });
    expect(created.ok()).toBe(true);
    const { token, serviceToken } = (await created.json()) as {
      token: string;
      serviceToken: { id: string };
    };
    expect(token).toMatch(/^ck_/);

    // Public API.
    const bearer = { authorization: `Bearer ${token}` };
    const described = await api(page).get("/api/v1/token", { headers: bearer });
    expect(((await described.json()) as { environment: { slug: string } }).environment.slug).toBe(
      "development",
    );
    const dotenv = await api(page).get("/api/v1/secrets?format=dotenv", { headers: bearer });
    expect(dotenv.headers()["cache-control"]).toBe("no-store");
    expect(await dotenv.text()).toContain("API_URL=https://api.example.com");

    // CLI with the token, without any login.
    const tokenEnv = cliEnv(tokenConfigDir, { CACHKEY_TOKEN: token });
    const pulled = cli(["pull", "--output", "-"], tokenEnv);
    expect(pulled.code).toBe(0);
    expect(pulled.stdout).toContain("API_URL=https://api.example.com");
    // A token cannot write.
    expect(cli(["set", "INTRUS", "x"], tokenEnv).code).not.toBe(0);

    // Both reads are in the activity log, without the value.
    await open(page, "/activity");
    await expect(page.getByText(/CI e2e/).first()).toBeVisible();
    const audit = await (await api(page).get("/api/audit")).text();
    expect(audit).not.toContain("https://api.example.com");

    // Revocation is immediate.
    const revoked = await api(page).delete(`/api/projects/${slug}/tokens/${serviceToken.id}`);
    expect(revoked.ok()).toBe(true);
    expect((await api(page).get("/api/v1/secrets", { headers: bearer })).status()).toBe(401);
    expect(cli(["pull", "--output", "-"], tokenEnv).code).not.toBe(0);
    expect(
      (
        await api(page).get("/api/v1/secrets", { headers: { authorization: "Bearer ck_faux" } })
      ).status(),
    ).toBe(401);

    // ── cachkey logout ──
    expect(cli(["logout"], env).code).toBe(0);
    expect(cli(["get", "API_URL", ...target], env).code).not.toBe(0);
  } finally {
    for (const dir of [configDir, tokenConfigDir]) rmSync(dir, { recursive: true, force: true });
  }
});
