import {
  auditCategories,
  type AuditPage,
  auditQuerySchema,
  defaultEnvironments,
  mainBrick,
  sharedBrick,
  type InvitationDetails,
  type MemberDto,
  type PendingInvitationDto,
  type ProjectAccessDto,
  projectAccessSchema,
  transferOwnershipSchema,
  type ProjectDto,
  type ProjectPermission,
  projectSchema,
  slugify,
  type Workspace,
} from "@cachkey/shared";
import { Elysia } from "elysia";
import { audit, type AuditActor, auditEventSelect, toAuditEventDtos } from "./audit";
import { prisma } from "./db";
import {
  HttpError,
  httpErrors,
  isMemberRole,
  type Membership,
  requireManager,
  requireMembership,
  requireProject,
  requireSession,
} from "./guards";

/**
 * Organisation-scoped business routes. Every route works on the session's active
 * organisation and checks the caller's role. Errors use Better Auth's `{ code, message }`
 * shape so the web app translates them the same way.
 */

function toDto(
  project: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  permission: ProjectPermission,
): ProjectDto {
  return {
    id: project.id,
    permission,
    name: project.name,
    slug: project.slug,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function actorOf(membership: Membership): AuditActor {
  return {
    organizationId: membership.organizationId,
    userId: membership.userId,
    userName: membership.userName,
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

const AUDIT_PAGE_SIZE = 50;

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

  /**
   * Ownership transfer: the target becomes owner, the current owner becomes admin, in one
   * transaction. Confirmed by typing the organisation's name (checked here too).
   */
  .post("/organization/transfer-ownership", async ({ request, body }) => {
    const membership = await requireMembership(request.headers);
    if (membership.role !== "owner") throw new HttpError(403, "FORBIDDEN");
    const parsed = transferOwnershipSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR");
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: membership.organizationId },
      select: { name: true },
    });
    if (parsed.data.confirmation !== organization.name) {
      throw new HttpError(400, "CONFIRMATION_MISMATCH");
    }
    if (parsed.data.userId === membership.userId) throw new HttpError(400, "VALIDATION_ERROR");
    const target = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: membership.organizationId,
          userId: parsed.data.userId,
        },
      },
      select: { id: true, user: { select: { email: true } } },
    });
    if (!target) throw new HttpError(404, "MEMBER_NOT_FOUND");

    await prisma.$transaction([
      prisma.member.update({ where: { id: target.id }, data: { role: "owner" } }),
      prisma.member.update({
        where: {
          organizationId_userId: {
            organizationId: membership.organizationId,
            userId: membership.userId,
          },
        },
        data: { role: "admin" },
      }),
      // Owners see every project: per-project accesses of the new owner are pointless.
      prisma.projectAccess.deleteMany({
        where: {
          userId: parsed.data.userId,
          project: { organizationId: membership.organizationId },
        },
      }),
    ]);
    await audit(
      actorOf(membership),
      { action: "member.ownership_transferred", target: target.user.email },
      request,
    );
    return { status: true };
  })

  // ── Invitations ─────────────────────────────────────────────────────────

  /** Pending invitations of the active organisation (owners and admins). */
  .get("/organization/invitations", async ({ request }): Promise<PendingInvitationDto[]> => {
    const { organizationId } = await requireManager(request.headers);
    const invitations = await prisma.invitation.findMany({
      where: { organizationId, status: "pending" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        inviter: { select: { name: true } },
      },
    });
    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role === "admin" ? "admin" : "member",
      inviterName: invitation.inviter.name,
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
      expired: invitation.expiresAt < new Date(),
    }));
  })

  /** Pending invitations sent to the signed-in address (onboarding, organisation switch). */
  .get("/invitations", async ({ request }): Promise<InvitationDetails[]> => {
    const session = await requireSession(request.headers);
    const invitations = await prisma.invitation.findMany({
      where: {
        email: { equals: session.user.email, mode: "insensitive" },
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        organization: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    });
    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role && isMemberRole(invitation.role) ? invitation.role : "member",
      status: "pending",
      organizationName: invitation.organization.name,
      inviterName: invitation.inviter.name,
      expiresAt: invitation.expiresAt.toISOString(),
    }));
  })

  /**
   * What the invited person sees before accepting. Requires a session; only the invited
   * address may read it (same rule as Better Auth's acceptance).
   */
  .get("/invitations/:id", async ({ request, params }): Promise<InvitationDetails> => {
    const session = await requireSession(request.headers);
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        organization: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    });
    if (!invitation) throw new HttpError(404, "INVITATION_NOT_FOUND");
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
      throw new HttpError(403, "INVITATION_FOR_ANOTHER_EMAIL");
    }
    const expired = invitation.status === "pending" && invitation.expiresAt < new Date();
    const status = expired ? "expired" : invitation.status;
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role && isMemberRole(invitation.role) ? invitation.role : "member",
      status:
        status === "accepted" ||
        status === "rejected" ||
        status === "canceled" ||
        status === "expired"
          ? status
          : "pending",
      organizationName: invitation.organization.name,
      inviterName: invitation.inviter.name,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  })

  // ── Projects ────────────────────────────────────────────────────────────

  /** Owners and admins see every project; members only those shared with them. */
  .get("/projects", async ({ request }): Promise<ProjectDto[]> => {
    const membership = await requireMembership(request.headers);
    if (membership.role === "owner" || membership.role === "admin") {
      const projects = await prisma.project.findMany({
        where: { organizationId: membership.organizationId },
        orderBy: { updatedAt: "desc" },
      });
      return projects.map((project) => toDto(project, "manage"));
    }
    const accesses = await prisma.projectAccess.findMany({
      where: { userId: membership.userId, project: { organizationId: membership.organizationId } },
      select: { level: true, project: true },
      orderBy: { project: { updatedAt: "desc" } },
    });
    return accesses.map((access) =>
      toDto(access.project, access.level === "write" ? "write" : "read"),
    );
  })

  .post("/projects", async ({ request, body, set }): Promise<ProjectDto> => {
    const membership = await requireManager(request.headers);
    const data = parseProject(body);
    const project = await prisma.project.create({
      data: {
        ...data,
        organizationId: membership.organizationId,
        createdById: membership.userId,
        slug: await availableSlug(membership.organizationId, data.name),
        environments: {
          create: defaultEnvironments.map((environment, position) => ({
            ...environment,
            position,
          })),
        },
        bricks: {
          create: [
            { ...mainBrick, kind: "main" },
            { ...sharedBrick, kind: "shared" },
          ],
        },
      },
    });
    await audit(actorOf(membership), { action: "project.created", project }, request);
    set.status = 201;
    return toDto(project, "manage");
  })

  .get("/projects/:slug", async ({ request, params }): Promise<ProjectDto> => {
    const { project, grant } = await requireProject(request.headers, params.slug);
    return toDto(project, grant.permission);
  })

  // The slug stays stable on rename so existing links keep working.
  .patch("/projects/:slug", async ({ request, params, body }): Promise<ProjectDto> => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: parseProject(body),
    });
    if (updated.name !== project.name || updated.description !== project.description) {
      await audit(
        actorOf(membership),
        {
          action: "project.updated",
          project: updated,
          details: updated.name !== project.name ? { from: project.name } : undefined,
        },
        request,
      );
    }
    return toDto(updated, "manage");
  })

  .delete("/projects/:slug", async ({ request, params }) => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    await prisma.project.delete({ where: { id: project.id } });
    await audit(actorOf(membership), { action: "project.deleted", project }, request);
    return { status: true };
  })

  // ── Project access (owners and admins) ──────────────────────────────────

  /** Every member of the organisation with what they can do in this project. */
  .get("/projects/:slug/access", async ({ request, params }): Promise<ProjectAccessDto[]> => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const [members, accesses] = await Promise.all([
      prisma.member.findMany({
        where: { organizationId: membership.organizationId },
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, avatarSeed: true } },
        },
      }),
      prisma.projectAccess.findMany({
        where: { projectId: project.id },
        select: { userId: true, level: true, environmentIds: true },
      }),
    ]);
    const byUser = new Map(accesses.map((access) => [access.userId, access]));
    return members.flatMap((member) => {
      if (!isMemberRole(member.role)) return [];
      const access = byUser.get(member.user.id);
      return [
        {
          user: member.user,
          role: member.role,
          access:
            member.role === "member" && access
              ? {
                  level: access.level === "write" ? "write" : "read",
                  environmentIds: access.environmentIds,
                }
              : null,
        },
      ];
    });
  })

  .put("/projects/:slug/access/:userId", async ({ request, params, body }) => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const parsed = projectAccessSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR");
    const target = await prisma.member.findUnique({
      where: {
        organizationId_userId: { organizationId: membership.organizationId, userId: params.userId },
      },
      select: { role: true, user: { select: { email: true } } },
    });
    if (!target) throw new HttpError(404, "MEMBER_NOT_FOUND");
    // Owners and admins already manage every project.
    if (target.role !== "member") throw new HttpError(409, "ACCESS_NOT_NEEDED");

    const environmentIds = [...new Set(parsed.data.environmentIds)];
    if (environmentIds.length) {
      const known = await prisma.environment.count({
        where: { projectId: project.id, id: { in: environmentIds } },
      });
      if (known !== environmentIds.length) throw new HttpError(400, "VALIDATION_ERROR");
    }
    const data = { level: parsed.data.level, environmentIds, grantedById: membership.userId };
    await prisma.projectAccess.upsert({
      where: { projectId_userId: { projectId: project.id, userId: params.userId } },
      create: { projectId: project.id, userId: params.userId, ...data },
      update: data,
    });
    await audit(
      actorOf(membership),
      {
        action: "access.granted",
        project,
        target: target.user.email,
        details: {
          level: parsed.data.level,
          environments: environmentIds.length || "all",
        },
      },
      request,
    );
    return { status: true };
  })

  .delete("/projects/:slug/access/:userId", async ({ request, params }) => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const removed = await prisma.projectAccess.deleteMany({
      where: { projectId: project.id, userId: params.userId },
    });
    if (removed.count) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true },
      });
      await audit(
        actorOf(membership),
        { action: "access.revoked", project, target: user?.email ?? null },
        request,
      );
    }
    return { status: true };
  })

  // ── Audit log (owners and admins) ───────────────────────────────────────

  .get("/audit", async ({ request, query, set }): Promise<AuditPage> => {
    const { organizationId } = await requireManager(request.headers);
    const parsed = auditQuerySchema.safeParse(query);
    if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR");
    const { category, projectId, cursor } = parsed.data;
    const rows = await prisma.auditEvent.findMany({
      where: {
        organizationId,
        ...(projectId ? { projectId } : {}),
        ...(category ? { action: { in: [...auditCategories[category]] } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: AUDIT_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: auditEventSelect,
    });
    set.headers["cache-control"] = "no-store";
    const page = rows.slice(0, AUDIT_PAGE_SIZE);
    return {
      nextCursor: rows.length > AUDIT_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
      events: page.flatMap(toAuditEventDtos),
    };
  })

  /** Projects for the log filter: id and name, owners and admins only. */
  .get("/audit/projects", async ({ request }) => {
    const { organizationId } = await requireManager(request.headers);
    return prisma.project.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  });
