#!/usr/bin/env bun
import {
  type EnvironmentDto,
  type ImportResult,
  parseDotenv,
  type ProjectDto,
  type SecretDto,
  serializeDotenv,
  type Workspace,
} from "@cachkey/shared";
import { chmod } from "node:fs/promises";
import packageJson from "../package.json";
import { type Command, formatUserCode, HELP, type Options, parseArgs, resolveUrl } from "./args";
import { Api, ApiError } from "./client";
import {
  type Credentials,
  deleteCredentials,
  deleteLink,
  findLink,
  LINK_FILE,
  readCredentials,
  saveCredentials,
  saveLink,
} from "./config";
import { choose, CliError, confirm, info, interactive, openBrowser, readSecret } from "./terminal";

/*
 * Cachkey CLI.
 *
 * - Signed in (`cachkey login`): acts as the user, with the user's rights, on the project and
 *   environment of the linked folder (`cachkey link`) or of --org/--project/--env.
 * - With a service token (CACHKEY_TOKEN): read-only, for servers and CI (pull, run, whoami).
 */

const CLIENT_ID = "cachkey-cli";
const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

type Context = { options: Options; credentials: Credentials | null };

type Scope = { api: Api; organization: { id: string; name: string } };
type Target = Scope & { project: string; environment: string };

const enc = encodeURIComponent;

// ── Credentials and target ──────────────────────────────────────────────────

function serviceToken(options: Options): string | null {
  return options.token ?? process.env.CACHKEY_TOKEN ?? null;
}

function tokenApi({ options, credentials }: Context, token: string): Api {
  return new Api(resolveUrl(options.url, process.env, credentials?.url), token);
}

function sessionApi({ options, credentials }: Context): Api {
  if (!credentials) {
    throw new CliError(
      "Vous n'êtes pas connecté. Lancez « cachkey login » (ou utilisez un jeton CACHKEY_TOKEN).",
    );
  }
  return new Api(resolveUrl(options.url, process.env, credentials.url), credentials.token);
}

function workspaceOf(api: Api): Promise<Workspace> {
  return api.request<Workspace>("GET", "/api/workspace");
}

/** Organisation: --org, then the linked folder, then the account's first organisation. */
async function resolveScope(context: Context): Promise<Scope> {
  const api = sessionApi(context);
  const { org } = context.options;
  let organization = org ? null : (await findLink())?.link.organization;
  if (!organization) {
    const workspace = await workspaceOf(api);
    const match = org
      ? workspace.organizations.find((item) => item.slug === org || item.id === org)
      : workspace.active;
    if (!match) {
      throw new CliError(
        org ? `Organisation introuvable : ${org}.` : "Aucune organisation pour ce compte.",
      );
    }
    organization = { id: match.id, name: match.name };
  }
  return { api: api.withOrganization(organization.id), organization };
}

/** Project and environment: options first, then the linked folder. */
async function resolveTarget(context: Context, needs: "project" | "environment"): Promise<Target> {
  const scope = await resolveScope(context);
  const link = (await findLink())?.link;
  const sameOrg = link?.organization.id === scope.organization.id;
  const project = context.options.project ?? (sameOrg ? link?.project : undefined);
  const environment = context.options.env ?? (sameOrg ? link?.environment : undefined) ?? "";
  if (!project || (needs === "environment" && !environment)) {
    throw new CliError(
      "Aucun projet pour ce dossier. Lancez « cachkey link » ou précisez --project et --env.",
    );
  }
  return { ...scope, project, environment };
}

const envPath = (target: Target) =>
  `/api/projects/${enc(target.project)}/environments/${enc(target.environment)}`;

async function findSecret(target: Target, key: string): Promise<SecretDto | null> {
  const secrets = await target.api.request<SecretDto[]>("GET", `${envPath(target)}/secrets`);
  return secrets.find((secret) => secret.key === key) ?? null;
}

/** Every variable with its value: through the token API, or the session export. */
async function loadValues(
  context: Context,
): Promise<{ values: Record<string, string>; label: string }> {
  const token = serviceToken(context.options);
  if (token) {
    const data = await tokenApi(context, token).request<{
      project: { name: string };
      environment: { name: string };
      secrets: Record<string, string>;
    }>("GET", "/api/v1/secrets");
    return { values: data.secrets, label: `${data.project.name} (${data.environment.name})` };
  }
  const target = await resolveTarget(context, "environment");
  const { content } = await target.api.request<{ content: string }>(
    "POST",
    `${envPath(target)}/export`,
  );
  return {
    values: Object.fromEntries(
      parseDotenv(content).entries.map((entry) => [entry.key, entry.value]),
    ),
    label: `${target.project} (${target.environment})`,
  };
}

// ── Sign in ─────────────────────────────────────────────────────────────────

async function login({ options, credentials }: Context): Promise<number> {
  const baseUrl = resolveUrl(options.url, process.env, credentials?.url);
  const api = new Api(baseUrl, null);
  const code = await api.request<{
    device_code: string;
    user_code: string;
    verification_uri_complete: string;
    interval: number;
    expires_in: number;
  }>("POST", "/api/auth/device/code", { client_id: CLIENT_ID });

  const url = new URL(code.verification_uri_complete, baseUrl).toString();
  info(`\nVotre code : ${formatUserCode(code.user_code)}\n`);
  const opened = !options.noBrowser && interactive && openBrowser(url);
  info(
    opened
      ? `Le navigateur s'ouvre sur ${url}\nVérifiez que le code affiché est le même, puis autorisez ce terminal.`
      : `Ouvrez cette adresse dans un navigateur et autorisez ce terminal :\n  ${url}`,
  );
  info("En attente de votre autorisation… (Ctrl+C pour annuler)");

  let interval = Math.max(code.interval, 1) * 1000;
  const deadline = Date.now() + code.expires_in * 1000;
  while (Date.now() < deadline) {
    await Bun.sleep(interval);
    let accessToken: string;
    try {
      const token = await api.request<{ access_token: string }>("POST", "/api/auth/device/token", {
        grant_type: DEVICE_GRANT,
        device_code: code.device_code,
        client_id: CLIENT_ID,
      });
      accessToken = token.access_token;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === "authorization_pending") continue;
      if (error.code === "slow_down") {
        interval += 5000;
        continue;
      }
      if (error.code === "access_denied") {
        throw new CliError("Connexion refusée depuis le navigateur.");
      }
      if (error.code === "expired_token") break;
      throw error;
    }
    const session = await new Api(baseUrl, accessToken).request<{
      user: { name: string; email: string };
    } | null>("GET", "/api/auth/get-session");
    if (!session) throw new CliError("La connexion a échoué. Réessayez.");
    await saveCredentials({
      url: baseUrl,
      token: accessToken,
      user: { name: session.user.name, email: session.user.email },
    });
    info(`\nConnecté en tant que ${session.user.name} (${session.user.email}).`);
    if (!(await findLink())) info("Associez maintenant ce dossier à un projet : cachkey link");
    return 0;
  }
  throw new CliError("Le code a expiré. Relancez « cachkey login ».");
}

async function logout(context: Context): Promise<number> {
  if (!context.credentials) {
    info("Ce terminal n'est pas connecté.");
    return 0;
  }
  // Revokes the session on the server too; the local file goes even if the server is away.
  await sessionApi(context)
    .request("POST", "/api/auth/sign-out", {})
    .catch(() => undefined);
  await deleteCredentials();
  info("Terminal déconnecté.");
  return 0;
}

async function whoami(context: Context): Promise<number> {
  const token = serviceToken(context.options);
  const rows: [string, string][] = [];
  if (token) {
    const data = await tokenApi(context, token).request<{
      name: string;
      expiresAt: string | null;
      organization: { name: string };
      project: { name: string };
      environment: { name: string };
    }>("GET", "/api/v1/token");
    rows.push(
      ["Jeton", data.name],
      ["Organisation", data.organization.name],
      ["Projet", data.project.name],
      ["Environnement", data.environment.name],
      [
        "Expiration",
        data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("fr-FR") : "jamais",
      ],
    );
  } else {
    const api = sessionApi(context);
    const session = await api.request<{ user: { name: string; email: string } } | null>(
      "GET",
      "/api/auth/get-session",
    );
    if (!session) throw new ApiError(401, null);
    rows.push(
      ["Compte", `${session.user.name} (${session.user.email})`],
      ["Instance", api.baseUrl],
    );
    const found = await findLink();
    if (found) {
      rows.push(
        ["Organisation", found.link.organization.name],
        ["Projet", found.link.project],
        ["Environnement", found.link.environment],
        ["Dossier lié", found.path],
      );
    } else {
      rows.push(["Dossier lié", "aucun (cachkey link)"]);
    }
  }
  for (const [label, value] of rows) console.log(`${label.padEnd(15)}${value}`);
  return 0;
}

// ── Linked folder ───────────────────────────────────────────────────────────

async function link(context: Context): Promise<number> {
  const api = sessionApi(context);
  const { options } = context;
  const workspace = await workspaceOf(api);
  if (workspace.organizations.length === 0) {
    throw new CliError("Aucune organisation pour ce compte.");
  }
  const organization = options.org
    ? workspace.organizations.find((org) => org.slug === options.org || org.id === options.org)
    : await choose("Organisation", workspace.organizations, (org) => org.name);
  if (!organization) throw new CliError(`Organisation introuvable : ${options.org}.`);
  const scoped = api.withOrganization(organization.id);

  const projects = await scoped.request<ProjectDto[]>("GET", "/api/projects");
  if (projects.length === 0) throw new CliError("Aucun projet accessible dans cette organisation.");
  const project = options.project
    ? projects.find((item) => item.slug === options.project)
    : await choose("Projet", projects, (item) => `${item.name} (${item.slug})`);
  if (!project) throw new CliError(`Projet introuvable : ${options.project}.`);

  const environments = await scoped.request<EnvironmentDto[]>(
    "GET",
    `/api/projects/${enc(project.slug)}/environments`,
  );
  if (environments.length === 0) {
    throw new CliError("Aucun environnement accessible dans ce projet.");
  }
  const environment = options.env
    ? environments.find((item) => item.slug === options.env)
    : await choose("Environnement", environments, (item) => item.name);
  if (!environment) throw new CliError(`Environnement introuvable : ${options.env}.`);

  const path = await saveLink({
    organization: { id: organization.id, name: organization.name },
    project: project.slug,
    environment: environment.slug,
  });
  info(`Dossier lié à ${project.name} (${environment.name}) : ${path}`);
  info(`${LINK_FILE} ne contient aucun secret : vous pouvez le partager avec votre équipe.`);
  return 0;
}

async function unlink(): Promise<number> {
  const found = await findLink();
  if (!found) {
    info("Ce dossier n'est lié à aucun projet.");
    return 0;
  }
  await deleteLink(found.path);
  info(`Lien retiré (${found.path}).`);
  return 0;
}

// ── Read and change ─────────────────────────────────────────────────────────

async function listOrgs(context: Context): Promise<number> {
  const workspace = await workspaceOf(sessionApi(context));
  for (const org of workspace.organizations) console.log(`${org.slug.padEnd(28)} ${org.name}`);
  return 0;
}

async function listProjects(context: Context): Promise<number> {
  const { api } = await resolveScope(context);
  const projects = await api.request<ProjectDto[]>("GET", "/api/projects");
  if (projects.length === 0) info("Aucun projet accessible.");
  for (const project of projects) console.log(`${project.slug.padEnd(28)} ${project.name}`);
  return 0;
}

async function listEnvs(context: Context): Promise<number> {
  const target = await resolveTarget(context, "project");
  const environments = await target.api.request<EnvironmentDto[]>(
    "GET",
    `/api/projects/${enc(target.project)}/environments`,
  );
  for (const environment of environments) {
    const count = environment.secretCount;
    console.log(`${environment.slug.padEnd(28)} ${count} variable${count > 1 ? "s" : ""}`);
  }
  return 0;
}

async function listSecrets(context: Context): Promise<number> {
  const target = await resolveTarget(context, "environment");
  const secrets = await target.api.request<SecretDto[]>("GET", `${envPath(target)}/secrets`);
  if (secrets.length === 0) info(`Aucune variable dans ${target.environment}.`);
  for (const secret of secrets) {
    const date = new Date(secret.updatedAt).toLocaleDateString("fr-FR");
    console.log(`${secret.key.padEnd(36)} ${(secret.empty ? "(vide)" : "").padEnd(8)}${date}`);
  }
  return 0;
}

async function getSecret(context: Context, key: string): Promise<number> {
  const target = await resolveTarget(context, "environment");
  const secret = await findSecret(target, key);
  if (!secret) throw new CliError(`La variable ${key} n'existe pas dans ${target.environment}.`);
  const { value } = await target.api.request<{ value: string }>(
    "POST",
    `${envPath(target)}/secrets/${enc(secret.id)}/reveal`,
  );
  // No trailing newline when piped, so `$(cachkey get X)` gets the exact value.
  process.stdout.write(process.stdout.isTTY ? `${value}\n` : value);
  return 0;
}

async function setSecret(context: Context, key: string, given: string | null): Promise<number> {
  const target = await resolveTarget(context, "environment");
  const value = given ?? (await readSecret(`Valeur de ${key} (masquée) : `));
  const existing = await findSecret(target, key);
  if (existing) {
    await target.api.request("PATCH", `${envPath(target)}/secrets/${enc(existing.id)}`, { value });
    info(`${key} modifiée dans ${target.environment}.`);
  } else {
    await target.api.request("POST", `${envPath(target)}/secrets`, { key, value });
    info(`${key} ajoutée dans ${target.environment}.`);
  }
  return 0;
}

async function removeSecret(context: Context, key: string): Promise<number> {
  const target = await resolveTarget(context, "environment");
  const secret = await findSecret(target, key);
  if (!secret) throw new CliError(`La variable ${key} n'existe pas dans ${target.environment}.`);
  const confirmed =
    context.options.yes ||
    (await confirm(`Supprimer ${key} et tout son historique de ${target.environment} ?`));
  if (!confirmed) {
    info("Rien n'a été supprimé.");
    return 1;
  }
  await target.api.request("DELETE", `${envPath(target)}/secrets/${enc(secret.id)}`);
  info(`${key} supprimée de ${target.environment}.`);
  return 0;
}

async function importFile(context: Context, file: string): Promise<number> {
  const target = await resolveTarget(context, "environment");
  const handle = Bun.file(file);
  if (!(await handle.exists())) throw new CliError(`Fichier introuvable : ${file}.`);
  const result = await target.api.request<ImportResult>("POST", `${envPath(target)}/import`, {
    content: await handle.text(),
    overwrite: context.options.overwrite,
  });
  info(
    `${target.environment} : ${result.created} ajoutée(s), ${result.updated} remplacée(s), ${result.unchanged} identique(s), ${result.skipped} gardée(s).`,
  );
  if (result.skipped > 0 && !context.options.overwrite) {
    info("Les variables existantes ont été gardées : ajoutez --overwrite pour les remplacer.");
  }
  if (result.invalidLines.length > 0)
    info(`Lignes illisibles : ${result.invalidLines.join(", ")}.`);
  return 0;
}

// ── Use ─────────────────────────────────────────────────────────────────────

async function pull(context: Context): Promise<number> {
  const { values, label } = await loadValues(context);
  const entries = Object.entries(values).map(([key, value]) => ({ key, value }));
  const content =
    context.options.format === "json"
      ? `${JSON.stringify(values, null, 2)}\n`
      : serializeDotenv(entries);
  const output = context.options.output;
  if (!output) {
    process.stdout.write(content);
    return 0;
  }
  await Bun.write(output, content);
  await chmod(output, 0o600).catch(() => undefined);
  info(`${entries.length} variable(s) de ${label} écrite(s) dans ${output}.`);
  return 0;
}

async function run(context: Context, command: string[]): Promise<number> {
  const { values } = await loadValues(context);
  const [program, ...args] = command;
  if (!program) return 2;
  let child: Bun.Subprocess;
  try {
    // The variables override the current environment, for the child process only.
    child = Bun.spawn([program, ...args], {
      env: { ...process.env, ...values },
      stdio: ["inherit", "inherit", "inherit"],
    });
  } catch {
    throw new CliError(`Impossible de lancer « ${program} ».`);
  }
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => child.kill(signal));
  }
  return await child.exited;
}

// ── Entry point ─────────────────────────────────────────────────────────────

function dispatch(command: Command, context: Context): Promise<number> | number {
  switch (command.name) {
    case "help":
      console.log(HELP);
      return 0;
    case "version":
      console.log(packageJson.version);
      return 0;
    case "login":
      return login(context);
    case "logout":
      return logout(context);
    case "whoami":
      return whoami(context);
    case "link":
      return link(context);
    case "unlink":
      return unlink();
    case "orgs":
      return listOrgs(context);
    case "projects":
      return listProjects(context);
    case "envs":
      return listEnvs(context);
    case "secrets":
      return listSecrets(context);
    case "get":
      return getSecret(context, command.key);
    case "set":
      return setSecret(context, command.key, command.value);
    case "rm":
      return removeSecret(context, command.key);
    case "import":
      return importFile(context, command.file);
    case "pull":
      return pull(context);
    case "run":
      return run(context, command.command);
  }
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if ("error" in parsed) {
    console.error(parsed.error);
    return 2;
  }
  const context: Context = { options: parsed.options, credentials: await readCredentials() };
  return dispatch(parsed.command, context);
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error instanceof CliError ? error.message : "Erreur inattendue.");
    if (!(error instanceof CliError) && process.env.CACHKEY_DEBUG) console.error(error);
    process.exit(1);
  });
