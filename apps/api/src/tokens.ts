import {
  type CreatedServiceToken,
  MAX_TOKENS_PER_PROJECT,
  SERVICE_TOKEN_PREFIX,
  serializeDotenv,
  type ServiceTokenDto,
  serviceTokenSchema,
} from "@cachkey/shared";
import { createHash, randomBytes } from "node:crypto";
import { Elysia, t } from "elysia";
import { type AuditActor, audit } from "./audit";
import { prisma } from "./db";
import { HttpError, httpErrors, type Membership, requireProject } from "./guards";
import { environmentValues } from "./secrets";

/*
 * Service tokens and the public API they open.
 *
 * - Management (session, owners and admins): /api/projects/:slug/tokens.
 * - Public API v1 (`Authorization: Bearer ck_…`): read-only access to the token's single
 *   environment. Every read of values is written to the audit log, never the values.
 *
 * A token is 32 random bytes; only its SHA-256 is stored, so a database leak does not leak
 * usable tokens. The full token is returned once, at creation.
 */

const author = { select: { id: true, name: true, avatarSeed: true } } as const;

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function generateToken(): string {
  return `${SERVICE_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

function actorOf(membership: Membership): AuditActor {
  return {
    organizationId: membership.organizationId,
    userId: membership.userId,
    userName: membership.userName,
  };
}

const tokenSelect = {
  id: true,
  name: true,
  prefix: true,
  createdAt: true,
  expiresAt: true,
  lastUsedAt: true,
  createdBy: author,
  environment: { select: { id: true, name: true, slug: true } },
} as const;

function tokenDto(token: {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdBy: { id: string; name: string; avatarSeed: string | null } | null;
  environment: { id: string; name: string; slug: string };
}): ServiceTokenDto {
  return {
    ...token,
    createdAt: token.createdAt.toISOString(),
    expiresAt: token.expiresAt?.toISOString() ?? null,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
  };
}

export const tokenRoutes = new Elysia({ prefix: "/api/projects/:slug/tokens" })
  .use(httpErrors)
  .onAfterHandle({ as: "scoped" }, ({ set }) => {
    set.headers["cache-control"] = "no-store";
  })

  .get("/", async ({ request, params }): Promise<ServiceTokenDto[]> => {
    const { project } = await requireProject(request.headers, params.slug, "manage");
    const tokens = await prisma.serviceToken.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: tokenSelect,
    });
    return tokens.map(tokenDto);
  })

  .post("/", async ({ request, params, body, set }): Promise<CreatedServiceToken> => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const parsed = serviceTokenSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR");
    const { name, environmentId, expiresInDays } = parsed.data;
    const environment = await prisma.environment.findFirst({
      where: { id: environmentId, projectId: project.id },
      select: { id: true, name: true },
    });
    if (!environment) throw new HttpError(404, "ENVIRONMENT_NOT_FOUND");
    const count = await prisma.serviceToken.count({ where: { projectId: project.id } });
    if (count >= MAX_TOKENS_PER_PROJECT) throw new HttpError(409, "TOO_MANY_TOKENS");

    const token = generateToken();
    const created = await prisma.serviceToken.create({
      data: {
        projectId: project.id,
        environmentId: environment.id,
        name,
        tokenHash: hashToken(token),
        prefix: token.slice(0, SERVICE_TOKEN_PREFIX.length + 6),
        expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
        createdById: membership.userId,
      },
      select: tokenSelect,
    });
    await audit(
      actorOf(membership),
      {
        action: "token.created",
        project,
        environmentName: environment.name,
        target: name,
        details: { expiresInDays: expiresInDays ?? 0 },
      },
      request,
    );
    set.status = 201;
    return { token, serviceToken: tokenDto(created) };
  })

  .delete("/:id", async ({ request, params }) => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const token = await prisma.serviceToken.findFirst({
      where: { id: params.id, projectId: project.id },
      select: { id: true, name: true, environment: { select: { name: true } } },
    });
    if (!token) throw new HttpError(404, "TOKEN_NOT_FOUND");
    await prisma.serviceToken.delete({ where: { id: token.id } });
    await audit(
      actorOf(membership),
      {
        action: "token.revoked",
        project,
        environmentName: token.environment.name,
        target: token.name,
      },
      request,
    );
    return { status: true };
  });

// ── Public API v1 ──────────────────────────────────────────────────────────

/** The token of the request, with its project and environment. 401 for anything invalid. */
async function requireToken(headers: Headers) {
  const header = headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const raw = match?.[1];
  if (!raw?.startsWith(SERVICE_TOKEN_PREFIX)) throw new HttpError(401, "INVALID_TOKEN");
  const token = await prisma.serviceToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: {
      project: { include: { organization: { select: { id: true, name: true } } } },
      environment: true,
    },
  });
  if (!token || (token.expiresAt && token.expiresAt <= new Date())) {
    throw new HttpError(401, "INVALID_TOKEN");
  }
  // One write per minute at most: enough for « last used », cheap for busy scripts.
  if (!token.lastUsedAt || Date.now() - token.lastUsedAt.getTime() > 60_000) {
    await prisma.serviceToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    });
  }
  return token;
}

const errorSchema = t.Object({ code: t.String(), message: t.String() });

const scopeSchema = t.Object({
  organization: t.Object({ id: t.String(), name: t.String() }),
  project: t.Object({ id: t.String(), name: t.String(), slug: t.String() }),
  environment: t.Object({ id: t.String(), name: t.String(), slug: t.String() }),
});

export const publicApiRoutes = new Elysia({ prefix: "/api/v1" })
  .use(httpErrors)
  .onAfterHandle({ as: "scoped" }, ({ set }) => {
    set.headers["cache-control"] = "no-store";
  })

  .get(
    "/token",
    async ({ request }) => {
      const token = await requireToken(request.headers);
      return {
        name: token.name,
        expiresAt: token.expiresAt?.toISOString() ?? null,
        organization: token.project.organization,
        project: { id: token.project.id, name: token.project.name, slug: token.project.slug },
        environment: {
          id: token.environment.id,
          name: token.environment.name,
          slug: token.environment.slug,
        },
      };
    },
    {
      detail: {
        summary: "Describe the token",
        description: "The project and environment the token gives access to. Reads no value.",
        tags: ["Tokens"],
        security: [{ bearer: [] }],
      },
      response: {
        200: t.Composite([
          scopeSchema,
          t.Object({ name: t.String(), expiresAt: t.Nullable(t.String({ format: "date-time" })) }),
        ]),
        401: errorSchema,
      },
    },
  )

  .get(
    "/secrets",
    async ({ request, query, set }) => {
      const token = await requireToken(request.headers);
      const { project, environment } = token;
      const secrets = await environmentValues(project, environment.id);
      await audit(
        {
          organizationId: project.organizationId,
          userId: null,
          userName: `Jeton « ${token.name} »`,
        },
        {
          action: "environment.pulled",
          project,
          environmentName: environment.name,
          details: { variables: secrets.length, via: "token" },
        },
        request,
      );
      if (query.format === "dotenv") {
        set.headers["content-type"] = "text/plain; charset=utf-8";
        return serializeDotenv(secrets);
      }
      return {
        organization: project.organization,
        project: { id: project.id, name: project.name, slug: project.slug },
        environment: { id: environment.id, name: environment.name, slug: environment.slug },
        secrets: Object.fromEntries(secrets.map((secret) => [secret.key, secret.value])),
      };
    },
    {
      query: t.Object({
        format: t.Optional(
          t.UnionEnum(["json", "dotenv"], {
            description: "`json` (default) or `dotenv` for a ready-to-use `.env` file.",
          }),
        ),
      }),
      detail: {
        summary: "Read the variables",
        description:
          "Every variable of the token's environment with its value. Each call is recorded in the organisation's activity log (never the values).",
        tags: ["Secrets"],
        security: [{ bearer: [] }],
      },
      response: {
        200: t.Union([
          t.Composite([scopeSchema, t.Object({ secrets: t.Record(t.String(), t.String()) })]),
          t.String({ description: "`.env` file, when `format=dotenv`." }),
        ]),
        401: errorSchema,
      },
    },
  );
