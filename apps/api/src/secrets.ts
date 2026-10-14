import {
  type EnvironmentDto,
  environmentSchema,
  type ImportResult,
  importSchema,
  MAX_ENVIRONMENTS,
  MAX_SECRET_VALUE_LENGTH,
  MAX_SECRETS_PER_ENVIRONMENT,
  parseDotenv,
  type SecretDto,
  secretSchema,
  secretUpdateSchema,
  type SecretVersionDto,
  serializeDotenv,
  slugify,
} from "@cachkey/shared";
import { Elysia } from "elysia";
import type { z } from "zod";
import {
  decryptSecret,
  encryptSecret,
  generateDataKey,
  isEmptyCiphertext,
  unwrapDataKey,
  wrapDataKey,
} from "./crypto";
import { prisma } from "./db";
import { env } from "./env";
import { type AuditActor, audit } from "./audit";
import {
  coversEnvironment,
  HttpError,
  httpErrors,
  type Membership,
  requireProject,
} from "./guards";

/*
 * Environments and their encrypted variables, under /api/projects/:slug.
 *
 * Owners and admins manage everything; members only see the projects and environments
 * shared with them, read-only or with write access (see guards.ts). Values never leave the
 * API unless explicitly requested (reveal, export): those responses are never cached and
 * always written to the audit log.
 */

const masterKey = Buffer.from(env.ENCRYPTION_KEY, "base64");

const author = { select: { id: true, name: true, avatarSeed: true } } as const;

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR");
  return parsed.data;
}

/** The project's data key, created on first use (projects from before encryption have none). */
export async function dataKeyOf(project: {
  id: string;
  encryptedKey: string | null;
}): Promise<Buffer> {
  if (project.encryptedKey) return unwrapDataKey(masterKey, project.encryptedKey, project.id);
  const wrapped = wrapDataKey(masterKey, generateDataKey(), project.id);
  // Only one concurrent request may set it; the others read the winner's key.
  await prisma.project.updateMany({
    where: { id: project.id, encryptedKey: null },
    data: { encryptedKey: wrapped },
  });
  const { encryptedKey } = await prisma.project.findUniqueOrThrow({
    where: { id: project.id },
    select: { encryptedKey: true },
  });
  if (!encryptedKey) throw new Error("Project data key missing");
  return unwrapDataKey(masterKey, encryptedKey, project.id);
}

async function findEnvironment(projectId: string, slug: string) {
  const environment = await prisma.environment.findUnique({
    where: { projectId_slug: { projectId, slug } },
  });
  if (!environment) throw new HttpError(404, "ENVIRONMENT_NOT_FOUND");
  return environment;
}

/**
 * Project + environment of the URL, checked against the caller's access. An environment
 * outside the access answers 404, like a missing one.
 */
async function scope(
  headers: Headers,
  params: { slug: string; env: string },
  needed: "read" | "write" = "read",
) {
  const { membership, project, grant } = await requireProject(headers, params.slug, needed);
  const environment = await findEnvironment(project.id, params.env);
  if (!coversEnvironment(grant, environment.id)) {
    throw new HttpError(404, "ENVIRONMENT_NOT_FOUND");
  }
  return { membership, project, environment };
}

function actorOf(membership: Membership): AuditActor {
  return {
    organizationId: membership.organizationId,
    userId: membership.userId,
    userName: membership.userName,
  };
}

async function findSecret(environmentId: string, id: string) {
  const secret = await prisma.secret.findFirst({ where: { id, environmentId } });
  if (!secret) throw new HttpError(404, "SECRET_NOT_FOUND");
  return secret;
}

function secretDto(secret: {
  id: string;
  key: string;
  version: number;
  value: string;
  updatedAt: Date;
  updatedBy: { id: string; name: string; avatarSeed: string | null } | null;
}): SecretDto {
  return {
    id: secret.id,
    key: secret.key,
    empty: isEmptyCiphertext(secret.value),
    version: secret.version,
    updatedAt: secret.updatedAt.toISOString(),
    updatedBy: secret.updatedBy,
  };
}

async function availableEnvironmentSlug(projectId: string, name: string): Promise<string> {
  const base = slugify(name) || "environnement";
  const taken = new Set(
    (await prisma.environment.findMany({ where: { projectId }, select: { slug: true } })).map(
      (environment) => environment.slug,
    ),
  );
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

/** Writes a new value: bumps the version and keeps the previous one in the history. */
async function writeValue(
  secret: { id: string; version: number },
  encrypted: string,
  userId: string,
) {
  const version = secret.version + 1;
  await prisma.$transaction([
    prisma.secret.update({
      where: { id: secret.id },
      data: { value: encrypted, version, updatedById: userId },
    }),
    prisma.secretVersion.create({
      data: { secretId: secret.id, version, value: encrypted, createdById: userId },
    }),
  ]);
}

/** Every variable of an environment with its decrypted value, sorted by name. */
export async function environmentValues(
  project: { id: string; encryptedKey: string | null },
  environmentId: string,
): Promise<{ key: string; value: string }[]> {
  const dataKey = await dataKeyOf(project);
  const secrets = await prisma.secret.findMany({
    where: { environmentId },
    orderBy: { key: "asc" },
    select: { key: true, value: true },
  });
  return secrets.map((secret) => ({
    key: secret.key,
    value: decryptSecret(dataKey, environmentId, secret.value),
  }));
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export const secretRoutes = new Elysia({ prefix: "/api/projects/:slug" })
  .use(httpErrors)
  .onAfterHandle({ as: "scoped" }, ({ set }) => {
    set.headers["cache-control"] = "no-store";
  })

  // ── Environments ──────────────────────────────────────────────────────────

  /** Only the environments the caller's access covers. */
  .get("/environments", async ({ request, params }): Promise<EnvironmentDto[]> => {
    const { project, grant } = await requireProject(request.headers, params.slug);
    const environments = await prisma.environment.findMany({
      where: {
        projectId: project.id,
        ...(grant.environmentIds ? { id: { in: grant.environmentIds } } : {}),
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, slug: true, _count: { select: { secrets: true } } },
    });
    return environments.map(({ _count, ...environment }) => ({
      ...environment,
      secretCount: _count.secrets,
    }));
  })

  .post("/environments", async ({ request, params, body, set }): Promise<EnvironmentDto> => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const { name } = parse(environmentSchema, body);
    const existing = await prisma.environment.aggregate({
      where: { projectId: project.id },
      _count: true,
      _max: { position: true },
    });
    if (existing._count >= MAX_ENVIRONMENTS) throw new HttpError(409, "TOO_MANY_ENVIRONMENTS");
    const environment = await prisma.environment.create({
      data: {
        projectId: project.id,
        name,
        slug: await availableEnvironmentSlug(project.id, name),
        position: (existing._max.position ?? -1) + 1,
      },
    });
    await audit(
      actorOf(membership),
      { action: "environment.created", project, environmentName: name },
      request,
    );
    set.status = 201;
    return { id: environment.id, name, slug: environment.slug, secretCount: 0 };
  })

  // The slug stays stable on rename so existing links keep working.
  .patch("/environments/:env", async ({ request, params, body }) => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const environment = await findEnvironment(project.id, params.env);
    const { name } = parse(environmentSchema, body);
    await prisma.environment.update({ where: { id: environment.id }, data: { name } });
    if (name !== environment.name) {
      await audit(
        actorOf(membership),
        {
          action: "environment.renamed",
          project,
          environmentName: name,
          details: { from: environment.name },
        },
        request,
      );
    }
    return { status: true };
  })

  .delete("/environments/:env", async ({ request, params }) => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const environment = await findEnvironment(project.id, params.env);
    const secretCount = await prisma.secret.count({ where: { environmentId: environment.id } });
    await prisma.environment.delete({ where: { id: environment.id } });
    // Accesses limited to this environment no longer cover it.
    await prisma.$executeRaw`UPDATE project_access SET environment_ids = array_remove(environment_ids, ${environment.id}) WHERE project_id = ${project.id}`;
    await audit(
      actorOf(membership),
      {
        action: "environment.deleted",
        project,
        environmentName: environment.name,
        details: { variables: secretCount },
      },
      request,
    );
    return { status: true };
  })

  // ── Variables (without values) ───────────────────────────────────────────

  .get("/environments/:env/secrets", async ({ request, params }): Promise<SecretDto[]> => {
    const { environment } = await scope(request.headers, params);
    const secrets = await prisma.secret.findMany({
      where: { environmentId: environment.id },
      orderBy: { key: "asc" },
      select: {
        id: true,
        key: true,
        value: true,
        version: true,
        updatedAt: true,
        updatedBy: author,
      },
    });
    return secrets.map(secretDto);
  })

  .post("/environments/:env/secrets", async ({ request, params, body, set }) => {
    const { membership, project, environment } = await scope(request.headers, params, "write");
    const { key, value } = parse(secretSchema, body);
    const count = await prisma.secret.count({ where: { environmentId: environment.id } });
    if (count >= MAX_SECRETS_PER_ENVIRONMENT) throw new HttpError(409, "TOO_MANY_SECRETS");
    const encrypted = encryptSecret(await dataKeyOf(project), environment.id, value);
    try {
      const secret = await prisma.secret.create({
        data: {
          environmentId: environment.id,
          key,
          value: encrypted,
          updatedById: membership.userId,
          versions: { create: { version: 1, value: encrypted, createdById: membership.userId } },
        },
        select: {
          id: true,
          key: true,
          value: true,
          version: true,
          updatedAt: true,
          updatedBy: author,
        },
      });
      await audit(
        actorOf(membership),
        { action: "secret.created", project, environmentName: environment.name, target: key },
        request,
      );
      set.status = 201;
      return secretDto(secret);
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, "SECRET_ALREADY_EXISTS");
      throw error;
    }
  })

  .patch("/environments/:env/secrets/:id", async ({ request, params, body }) => {
    const { membership, project, environment } = await scope(request.headers, params, "write");
    const secret = await findSecret(environment.id, params.id);
    const input = parse(secretUpdateSchema, body);
    const actor = actorOf(membership);
    const base = { project, environmentName: environment.name };

    let key = secret.key;
    if (input.key !== undefined && input.key !== secret.key) {
      try {
        await prisma.secret.update({
          where: { id: secret.id },
          data: { key: input.key, updatedById: membership.userId },
        });
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, "SECRET_ALREADY_EXISTS");
        throw error;
      }
      key = input.key;
      await audit(
        actor,
        { ...base, action: "secret.renamed", target: key, details: { from: secret.key } },
        request,
      );
    }
    if (input.value !== undefined) {
      const dataKey = await dataKeyOf(project);
      if (decryptSecret(dataKey, environment.id, secret.value) !== input.value) {
        await writeValue(
          secret,
          encryptSecret(dataKey, environment.id, input.value),
          membership.userId,
        );
        await audit(
          actor,
          {
            ...base,
            action: "secret.updated",
            target: key,
            details: { version: secret.version + 1 },
          },
          request,
        );
      }
    }
    return { status: true };
  })

  .delete("/environments/:env/secrets/:id", async ({ request, params }) => {
    const { membership, project, environment } = await scope(request.headers, params, "write");
    const secret = await findSecret(environment.id, params.id);
    await prisma.secret.delete({ where: { id: secret.id } });
    await audit(
      actorOf(membership),
      { action: "secret.deleted", project, environmentName: environment.name, target: secret.key },
      request,
    );
    return { status: true };
  })

  // ── Values: explicit reveal only, always logged ──────────────────────────

  .post("/environments/:env/secrets/:id/reveal", async ({ request, params }) => {
    const { membership, project, environment } = await scope(request.headers, params);
    const secret = await findSecret(environment.id, params.id);
    const value = decryptSecret(await dataKeyOf(project), environment.id, secret.value);
    await audit(
      actorOf(membership),
      {
        action: "secret.revealed",
        project,
        environmentName: environment.name,
        target: secret.key,
        details: { version: secret.version },
      },
      request,
    );
    return { value };
  })

  // ── History ──────────────────────────────────────────────────────────────

  .get(
    "/environments/:env/secrets/:id/versions",
    async ({ request, params }): Promise<SecretVersionDto[]> => {
      const { environment } = await scope(request.headers, params);
      const secret = await findSecret(environment.id, params.id);
      const versions = await prisma.secretVersion.findMany({
        where: { secretId: secret.id },
        orderBy: { version: "desc" },
        select: { version: true, createdAt: true, createdBy: author },
      });
      return versions.map((version) => ({
        version: version.version,
        createdAt: version.createdAt.toISOString(),
        createdBy: version.createdBy,
      }));
    },
  )

  .post("/environments/:env/secrets/:id/versions/:version/reveal", async ({ request, params }) => {
    const { membership, project, environment } = await scope(request.headers, params);
    const secret = await findSecret(environment.id, params.id);
    const version = await findVersion(secret.id, params.version);
    const value = decryptSecret(await dataKeyOf(project), environment.id, version.value);
    await audit(
      actorOf(membership),
      {
        action: "secret.version_revealed",
        project,
        environmentName: environment.name,
        target: secret.key,
        details: { version: version.version },
      },
      request,
    );
    return { value };
  })

  /** Makes an old value current again, as a new version (history is never rewritten). */
  .post("/environments/:env/secrets/:id/versions/:version/restore", async ({ request, params }) => {
    const { membership, project, environment } = await scope(request.headers, params, "write");
    const secret = await findSecret(environment.id, params.id);
    const version = await findVersion(secret.id, params.version);
    if (version.version !== secret.version) {
      await writeValue(secret, version.value, membership.userId);
      await audit(
        actorOf(membership),
        {
          action: "secret.restored",
          project,
          environmentName: environment.name,
          target: secret.key,
          details: { restored: version.version, version: secret.version + 1 },
        },
        request,
      );
    }
    return { status: true };
  })

  // ── .env import / export ─────────────────────────────────────────────────

  .post("/environments/:env/import", async ({ request, params, body }): Promise<ImportResult> => {
    const { membership, project, environment } = await scope(request.headers, params, "write");
    const userId = membership.userId;
    const { content, overwrite } = parse(importSchema, body);
    const { entries, invalidLines } = parseDotenv(content);
    const dataKey = await dataKeyOf(project);

    const existing = new Map(
      (await prisma.secret.findMany({ where: { environmentId: environment.id } })).map((secret) => [
        secret.key,
        secret,
      ]),
    );
    const newCount = entries.filter((entry) => !existing.has(entry.key)).length;
    if (existing.size + newCount > MAX_SECRETS_PER_ENVIRONMENT) {
      throw new HttpError(409, "TOO_MANY_SECRETS");
    }

    const result: ImportResult = { created: 0, updated: 0, unchanged: 0, skipped: 0, invalidLines };
    for (const { key, value } of entries) {
      if (value.length > MAX_SECRET_VALUE_LENGTH) {
        result.skipped++;
        continue;
      }
      const current = existing.get(key);
      const encrypted = encryptSecret(dataKey, environment.id, value);
      if (!current) {
        await prisma.secret.create({
          data: {
            environmentId: environment.id,
            key,
            value: encrypted,
            updatedById: userId,
            versions: { create: { version: 1, value: encrypted, createdById: userId } },
          },
        });
        result.created++;
      } else if (decryptSecret(dataKey, environment.id, current.value) === value) {
        result.unchanged++;
      } else if (overwrite) {
        await writeValue(current, encrypted, userId);
        result.updated++;
      } else {
        result.skipped++;
      }
    }
    if (result.created || result.updated) {
      await audit(
        actorOf(membership),
        {
          action: "environment.imported",
          project,
          environmentName: environment.name,
          details: { created: result.created, updated: result.updated },
        },
        request,
      );
    }
    return result;
  })

  .post("/environments/:env/export", async ({ request, params }) => {
    const { membership, project, environment } = await scope(request.headers, params);
    const secrets = await environmentValues(project, environment.id);
    const content = serializeDotenv(
      secrets,
      `${project.name} — ${environment.name}\nExporté depuis Cachkey le ${new Date().toISOString()}`,
    );
    await audit(
      actorOf(membership),
      {
        action: "environment.exported",
        project,
        environmentName: environment.name,
        details: { variables: secrets.length },
      },
      request,
    );
    return { filename: `.env.${environment.slug}`, content };
  });

async function findVersion(secretId: string, raw: string) {
  const version = Number(raw);
  if (!Number.isInteger(version) || version < 1) throw new HttpError(404, "VERSION_NOT_FOUND");
  const found = await prisma.secretVersion.findUnique({
    where: { secretId_version: { secretId, version } },
  });
  if (!found) throw new HttpError(404, "VERSION_NOT_FOUND");
  return found;
}
