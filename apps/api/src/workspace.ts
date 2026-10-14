import {
  defaultEnvironments,
  type MemberDto,
  type ProjectDto,
  projectSchema,
  slugify,
  type Workspace,
} from "@cachkey/shared";
import { Elysia } from "elysia";
import { prisma } from "./db";
import {
  findProject,
  HttpError,
  httpErrors,
  isMemberRole,
  requireManager,
  requireMembership,
  requireSession,
} from "./guards";

/**
 * Organisation-scoped business routes. Every route works on the session's active
 * organisation and checks the caller's role. Errors use Better Auth's `{ code, message }`
 * shape so the web app translates them the same way.
 */

function toDto(project: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/** First free slug in the organisation: `site-web`, then `site-web-2`, `site-web-3`… */
async function availableSlug(organizationId: string, name: string): Promise<string> {
  const base = slugify(name);
  const taken = new Set(
    (
      await prisma.project.findMany({
        where: { organizationId, slug: { startsWith: base } },
        select: { slug: true },
      })
    ).map((project) => project.slug),
  );
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

function parseProject(body: unknown) {
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR");
  return { name: parsed.data.name, description: parsed.data.description || null };
}

export const workspaceRoutes = new Elysia({ prefix: "/api" })
  .use(httpErrors)

  .get("/workspace", async ({ request }): Promise<Workspace> => {
    const session = await requireSession(request.headers);
    const memberships = await prisma.member.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { role: true, organization: { select: { id: true, name: true, slug: true } } },
    });
    const activeId = session.session.activeOrganizationId;
    const active = memberships.find((item) => item.organization.id === activeId);
    return {
      organizations: memberships.map((item) => item.organization),
      active:
        active && isMemberRole(active.role) ? { ...active.organization, role: active.role } : null,
    };
  })

  .get("/organization/members", async ({ request }): Promise<MemberDto[]> => {
    const { organizationId } = await requireMembership(request.headers);
    const members = await prisma.member.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, avatarSeed: true } },
      },
    });
    return members.flatMap((member) =>
      isMemberRole(member.role)
        ? [
            {
              id: member.id,
              role: member.role,
              joinedAt: member.createdAt.toISOString(),
              user: member.user,
            },
          ]
        : [],
    );
  })

  .get("/projects", async ({ request }): Promise<ProjectDto[]> => {
    const { organizationId } = await requireMembership(request.headers);
    const projects = await prisma.project.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    });
    return projects.map(toDto);
  })

  .post("/projects", async ({ request, body, set }): Promise<ProjectDto> => {
    const { organizationId, userId } = await requireManager(request.headers);
    const data = parseProject(body);
    const project = await prisma.project.create({
      data: {
        ...data,
        organizationId,
        createdById: userId,
        slug: await availableSlug(organizationId, data.name),
        environments: {
          create: defaultEnvironments.map((environment, position) => ({
            ...environment,
            position,
          })),
        },
      },
    });
    set.status = 201;
    return toDto(project);
  })

  .get("/projects/:slug", async ({ request, params }): Promise<ProjectDto> => {
    const { organizationId } = await requireMembership(request.headers);
    return toDto(await findProject(organizationId, params.slug));
  })

  // The slug stays stable on rename so existing links keep working.
  .patch("/projects/:slug", async ({ request, params, body }): Promise<ProjectDto> => {
    const { organizationId } = await requireManager(request.headers);
    const project = await findProject(organizationId, params.slug);
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: parseProject(body),
    });
    return toDto(updated);
  })

  .delete("/projects/:slug", async ({ request, params }) => {
    const { organizationId } = await requireManager(request.headers);
    const project = await findProject(organizationId, params.slug);
    await prisma.project.delete({ where: { id: project.id } });
    return { status: true };
  });
