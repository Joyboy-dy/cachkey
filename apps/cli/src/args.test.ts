import { describe, expect, test } from "bun:test";
import { DEFAULT_URL, formatUserCode, parseArgs, resolveUrl } from "./args";

function command(argv: string[]) {
  const parsed = parseArgs(argv);
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed;
}

describe("parseArgs", () => {
  test("defaults to help", () => {
    expect(command([]).command).toEqual({ name: "help" });
  });

  test("pull with options in both forms", () => {
    const parsed = command(["pull", "--format=json", "-o", ".env", "--url", "https://x.dev"]);
    expect(parsed.command).toEqual({ name: "pull" });
    expect(parsed.options).toMatchObject({ format: "json", output: ".env", url: "https://x.dev" });
  });

  test("run keeps everything after --, flags included", () => {
    const parsed = command(["--token", "ck_a", "run", "--", "node", "app.js", "--port", "3"]);
    expect(parsed.command).toEqual({ name: "run", command: ["node", "app.js", "--port", "3"] });
    expect(parsed.options.token).toBe("ck_a");
  });

  test("secret commands and their arguments", () => {
    expect(command(["get", "API_KEY", "--env", "staging"])).toMatchObject({
      command: { name: "get", key: "API_KEY" },
      options: { env: "staging" },
    });
    expect(command(["set", "A", "b"]).command).toEqual({ name: "set", key: "A", value: "b" });
    expect(command(["set", "A"]).command).toEqual({ name: "set", key: "A", value: null });
    expect(command(["rm", "A", "-y"]).options.yes).toBe(true);
    expect(command(["import", ".env", "--overwrite"])).toMatchObject({
      command: { name: "import", file: ".env" },
      options: { overwrite: true },
    });
    expect(command(["login", "--no-browser"]).options.noBrowser).toBe(true);
  });

  test("rejects mistakes with a readable message", () => {
    for (const argv of [
      ["run"],
      ["run", "--"],
      ["pull", "--", "x"],
      ["pull", "--format", "yaml"],
      ["pull", "--token"],
      ["push"],
      ["pull", "--nope", "x"],
      ["get"],
      ["link", "extra"],
    ]) {
      expect(parseArgs(argv)).toHaveProperty("error");
    }
  });
});

describe("resolveUrl", () => {
  test("option, then environment, then saved login, then default; no trailing slash", () => {
    expect(resolveUrl("https://a.dev/", { CACHKEY_URL: "https://b.dev" })).toBe("https://a.dev");
    expect(resolveUrl(null, { CACHKEY_URL: "https://b.dev//" }, "https://c.dev")).toBe(
      "https://b.dev",
    );
    expect(resolveUrl(null, {}, "https://c.dev")).toBe("https://c.dev");
    expect(resolveUrl(null, {})).toBe(DEFAULT_URL);
  });
});

test("formatUserCode", () => {
  expect(formatUserCode("WDJBMJHT")).toBe("WDJB-MJHT");
});

test("project commands", () => {
  expect(command(["init"]).command).toEqual({ name: "init", projectName: null });
  expect(command(["init", "Mon app"]).command).toEqual({ name: "init", projectName: "Mon app" });
  expect(command(["projects", "create", "Api"]).command).toEqual({
    name: "project-create",
    projectName: "Api",
  });
  expect(command(["envs", "create", "qa"]).command).toEqual({ name: "env-create", envName: "qa" });
  expect(command(["pull", "--all"]).options.all).toBe(true);
  expect(command(["pull", "-o", "-"]).options.output).toBe("-");
  expect(parseArgs(["projects", "delete", "x"])).toHaveProperty("error");
  expect(parseArgs(["envs", "create"])).toHaveProperty("error");
});
