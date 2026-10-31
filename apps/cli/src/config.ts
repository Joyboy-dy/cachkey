import { chmod, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, parse } from "node:path";

/*
 * Local state of the CLI.
 *
 * - Credentials (session from `cachkey login`): one file in the user's configuration
 *   directory, readable by the user only. Never inside a project folder.
 * - Link (`cachkey link`): `.cachkey.json` in the project folder. It holds identifiers only,
 *   no secret, so it can be committed and shared with the team.
 */

export type Credentials = {
  url: string;
  token: string;
  user: { name: string; email: string };
};

export type Link = {
  organization: { id: string; name: string };
  project: string;
  environment: string;
  /** Brick of the folder, for projects split into bricks (absent: the main brick). */
  brick?: string;
};

export const LINK_FILE = ".cachkey.json";

export function configDir(env: Record<string, string | undefined> = process.env): string {
  if (env.CACHKEY_CONFIG_DIR) return env.CACHKEY_CONFIG_DIR;
  if (process.platform === "win32") {
    return join(env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "cachkey");
  }
  return join(env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "cachkey");
}

const credentialsPath = () => join(configDir(), "credentials.json");

async function readJson<T>(path: string): Promise<T | null> {
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  try {
    return (await file.json()) as T;
  } catch {
    return null;
  }
}

export function readCredentials(): Promise<Credentials | null> {
  return readJson<Credentials>(credentialsPath());
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  const path = credentialsPath();
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await Bun.write(path, `${JSON.stringify(credentials, null, 2)}\n`);
  // No effect on Windows, where the user profile directory is already private.
  await chmod(path, 0o600).catch(() => undefined);
}

export async function deleteCredentials(): Promise<void> {
  await rm(credentialsPath(), { force: true });
}

/** The nearest `.cachkey.json`, from `cwd` up to the filesystem root. */
export async function findLink(cwd = process.cwd()): Promise<{ path: string; link: Link } | null> {
  let dir = cwd;
  const { root } = parse(cwd);
  for (;;) {
    const path = join(dir, LINK_FILE);
    const link = await readJson<Link>(path);
    if (link?.organization?.id && link.project && link.environment) return { path, link };
    if (dir === root) return null;
    dir = dirname(dir);
  }
}

export async function saveLink(link: Link, dir = process.cwd()): Promise<string> {
  const path = join(dir, LINK_FILE);
  await Bun.write(path, `${JSON.stringify(link, null, 2)}\n`);
  return path;
}

export async function deleteLink(path: string): Promise<void> {
  await rm(path, { force: true });
}
