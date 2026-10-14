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
  unwrapDataKey,
  wrapDataKey,
} from "./crypto";
import { prisma } from "./db";
import { env } from "./env";
import { findProject, HttpError, httpErrors, requireManager, requireMembership } from "./guards";

/*
 * Environments and their encrypted variables, under /api/projects/:slug.
 *
 * Every member of the organisation reads and edits variables; owners and admins also
 * create, rename and delete environments. Values never leave the API unless explicitly
 * requested (reveal, export) and those responses are never cached.
 */

const masterKey = Buffer.from(env.ENCRYPTION_KEY, "base64");

const author = { select: { id: true, name: true, avatarSeed: true } } as const;

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR");
  return parsed.data;
}

/** The project's data key, created on first use (projects from before encryption have none). */
async function dataKeyOf(project: { id: string; encryptedKey: string | null }): Promise<Buffer> {
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

/** Project + environment of the URL, for any member of the active organisation. */
async function scope(headers: Headers, params: { slug: string; env: string }) {
  const { organizationId, userId } = await requireMembership(headers);
  const project = await findProject(organizationId, params.slug);
  const environment = await findEnvironment(project.id, params.env);
  return { userId, project, environment };
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
  updatedAt: Date;
  updatedBy: { id: string; name: string; avatarSeed: string | null } | null;
}): SecretDto {
  return {
    id: secret.id,
    key: secret.key,
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

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export const secretRoutes = new Elysia({ prefix: "/api/projects/:slug" })
  .use(httpErrors)
  .onAfterHandle({ as: "scoped" }, ({ set }) => {
    set.headers["cache-control"] = "no-store";
  })

  // ── Environments ──────────────────────────────────────────────────────────

  .get("/environments", async ({ request, params }): Promise<EnvironmentDto[]> => {
    const { organizationId } = await requireMembership(request.headers);
    const project = await findProject(organizationId, params.slug);
    const environments = await prisma.environment.findMany({
      where: { projectId: project.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, slug: true, _count: { select: { secrets: true } } },
    });
    return environments.map(({ _count, ...environment }) => ({
      ...environment,
      secretCount: _count.secrets,
    }));
  })

  .post("/environments", async ({ request, params, body, set }): Promise<EnvironmentDto> => {
    const { organizationId } = await requireManager(request.headers);
    const project = await findProject(organizationId, params.slug);
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
    set.status = 201;
    return { id: environment.id, name, slug: environment.slug, secretCount: 0 };
  })

  // The slug stays stable on rename so existing links keep working.
  .patch("/environments/:env", async ({ request, params, body }) => {
    const { organizationId } = await requireManager(request.headers);
    const project = await findProject(organizationId, params.slug);
    const environment = await findEnvironment(project.id, params.env);
    const { name } = parse(environmentSchema, body);
    await prisma.environment.update({ where: { id: environment.id }, data: { name } });
    return { status: true };
  })

  .delete("/environments/:env", async ({ request, params }) => {
    const { organizationId } = await requireManager(request.headers);
    const project = await findProject(organizationId, params.slug);
    const environment = await findEnvironment(project.id, params.env);
    await prisma.environment.delete({ where: { id: environment.id } });
    return { status: true };
  })

  // ── Variables (without values) ───────────────────────────────────────────

  .get("/environments/:env/secrets", async ({ request, params }): Promise<SecretDto[]> => {
    const { environment } = await scope(request.headers, params);
    const secrets = await prisma.secret.findMany({
      where: { environmentId: environment.id },
      orderBy: { key: "asc" },
      select: { id: true, key: true, version: true, updatedAt: true, updatedBy: author },
    });
    return secrets.map(secretDto);
  })

  .post("/environments/:env/secrets", async ({ request, params, body, set }) => {
    const { userId, project, environment } = await scope(request.headers, params);
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
          updatedById: userId,
          versions: { create: { version: 1, value: encrypted, createdById: userId } },
        },
        select: { id: true, key: true, version: true, updatedAt: true, updatedBy: author },
      });
      set.status = 201;
      return secretDto(secret);
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, "SECRET_ALREADY_EXISTS");
      throw error;
    }
  })

  .patch("/environments/:env/secrets/:id", async ({ request, params, body }) => {
    const { userId, project, environment } = await scope(request.headers, params);
    const secret = await findSecret(environment.id, params.id);
    const input = parse(secretUpdateSchema, body);

    if (input.key !== undefined && input.key !== secret.key) {
      try {
        await prisma.secret.update({
          where: { id: secret.id },
          data: { key: input.key, updatedById: userId },
        });
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, "SECRET_ALREADY_EXISTS");
        throw error;
      }
    }
    if (input.value !== undefined) {
      const dataKey = await dataKeyOf(project);
      if (decryptSecret(dataKey, environment.id, secret.value) !== input.value) {
        await writeValue(secret, encryptSecret(dataKey, environment.id, input.value), userId);
      }
    }
    return { status: true };
  })

  .delete("/environments/:env/secrets/:id", async ({ request, params }) => {
    const { environment } = await scope(request.headers, params);
    const secret = await findSecret(environment.id, params.id);
    await prisma.secret.delete({ where: { id: secret.id } });
    return { status: true };
  })

  // ── Values: explicit reveal only ─────────────────────────────────────────

  .post("/environments/:env/secrets/:id/reveal", async ({ request, params }) => {
    const { project, environment } = await scope(request.headers, params);
    const secret = await findSecret(environment.id, params.id);
    return { value: decryptSecret(await dataKeyOf(project), environment.id, secret.value) };
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
    const { project, environment } = await scope(request.headers, params);
    const secret = await findSecret(environment.id, params.id);
    const version = await findVersion(secret.id, params.version);
    return { value: decryptSecret(await dataKeyOf(project), environment.id, version.value) };
  })

  /** Makes an old value current again, as a new version (history is never rewritten). */
  .post("/environments/:env/secrets/:id/versions/:version/restore", async ({ request, params }) => {
    const { userId, environment } = await scope(request.headers, params);
    const secret = await findSecret(environment.id, params.id);
    const version = await findVersion(secret.id, params.version);
    if (version.version !== secret.version) await writeValue(secret, version.value, userId);
    return { status: true };
  })

  // ── .env import / export ─────────────────────────────────────────────────

  .post("/environments/:env/import", async ({ request, params, body }): Promise<ImportResult> => {
    const { userId, project, environment } = await scope(request.headers, params);
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
    return result;
  })

  .post("/environments/:env/export", async ({ request, params }) => {
    const { project, environment } = await scope(request.headers, params);
    const dataKey = await dataKeyOf(project);
    const secrets = await prisma.secret.findMany({
      where: { environmentId: environment.id },
      orderBy: { key: "asc" },
      select: { key: true, value: true },
    });
    const content = serializeDotenv(
      secrets.map((secret) => ({
        key: secret.key,
        value: decryptSecret(dataKey, environment.id, secret.value),
      })),
      `${project.name} — ${environment.name}\nExporté depuis Cachkey le ${new Date().toISOString()}`,
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
