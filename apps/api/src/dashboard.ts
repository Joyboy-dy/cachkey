import {
  type ActivityDay,
  auditCategories,
  canManage,
  type Dashboard,
  type DashboardAlert,
  type DashboardProject,
} from "@cachkey/shared";
import { Elysia } from "elysia";
import { auditEventSelect, toAuditEventDtos } from "./audit";
import { isEmptyCiphertext } from "./crypto";
import { prisma } from "./db";
import { httpErrors, requireMembership } from "./guards";

/*
 * Overview page data, in one request: the projects the viewer can reach (with counts limited
 * to the environments they can see), what needs attention and recent activity (managers).
 * No secret value is read: emptiness comes from the ciphertext length.
 */

const ACTIVITY_DAYS = 14;
const EXPIRING_SOON_DAYS = 14;
const DAY = 86_400_000;

const READS = new Set<string>(auditCategories.reads);
const CHANGES = new Set<string>([...auditCategories.changes, ...auditCategories.structure]);

/** The last ACTIVITY_DAYS days, oldest first, as YYYY-MM-DD (UTC). */
function lastDays(now: Date): string[] {
  return Array.from({ length: ACTIVITY_DAYS }, (_, index) =>
    new Date(now.getTime() - (ACTIVITY_DAYS - 1 - index) * DAY).toISOString().slice(0, 10),
  );
}

export const dashboardRoutes = new Elysia({ prefix: "/api" })
  .use(httpErrors)
  .get("/dashboard", async ({ request, set }): Promise<Dashboard> => {
    const membership = await requireMembership(request.headers);
    const { organizationId } = membership;
    const manager = canManage(membership.role);
    set.headers["cache-control"] = "no-store";

    // Projects and, for members, the environments their access covers (null: all).
    const visible: {
      project: { id: string; name: string; slug: string; updatedAt: Date };
      permission: DashboardProject["permission"];
      environmentIds: string[] | null;
    }[] = manager
      ? (
          await prisma.project.findMany({
            where: { organizationId },
            select: { id: true, name: true, slug: true, updatedAt: true },
          })
        ).map((project) => ({ project, permission: "manage", environmentIds: null }))
      : (
          await prisma.projectAccess.findMany({
            where: { userId: membership.userId, project: { organizationId } },
            select: {
              level: true,
              environmentIds: true,
              project: { select: { id: true, name: true, slug: true, updatedAt: true } },
            },
          })
        ).map((access) => ({
          project: access.project,
          permission: access.level === "write" ? "write" : "read",
          environmentIds: access.environmentIds.length ? access.environmentIds : null,
        }));

    const environments = await prisma.environment.findMany({
      where: { projectId: { in: visible.map((entry) => entry.project.id) } },
      select: {
        id: true,
        projectId: true,
        secrets: { select: { value: true, updatedAt: true } },
      },
    });

    const projects: DashboardProject[] = visible
      .map(({ project, permission, environmentIds }) => {
        const own = environments.filter(
          (environment) =>
            environment.projectId === project.id &&
            (environmentIds === null || environmentIds.includes(environment.id)),
        );
        const secrets = own.flatMap((environment) => environment.secrets);
        const lastChange = secrets.reduce(
          (latest, secret) => (secret.updatedAt > latest ? secret.updatedAt : latest),
          project.updatedAt,
        );
        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          permission,
          environments: own.length,
          variables: secrets.length,
          emptyVariables: secrets.filter((secret) => isEmptyCiphertext(secret.value)).length,
          lastChangeAt: lastChange.toISOString(),
        };
      })
      .sort((a, b) => b.lastChangeAt.localeCompare(a.lastChangeAt));

    if (!manager) return { projects, alerts: null, activity: null, setup: null };

    const now = new Date();
    const days = lastDays(now);
    const [tokens, pendingInvitations, members, events, recent] = await Promise.all([
      prisma.serviceToken.findMany({
        where: {
          project: { organizationId },
          expiresAt: { not: null, lte: new Date(now.getTime() + EXPIRING_SOON_DAYS * DAY) },
        },
        orderBy: { expiresAt: "asc" },
        select: { name: true, expiresAt: true, project: { select: { name: true, slug: true } } },
      }),
      prisma.invitation.count({ where: { organizationId, status: "pending" } }),
      prisma.member.count({ where: { organizationId } }),
      prisma.auditEvent.findMany({
        where: { organizationId, createdAt: { gte: new Date(`${days[0]}T00:00:00.000Z`) } },
        select: { action: true, createdAt: true },
      }),
      prisma.auditEvent.findMany({
        where: { organizationId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
        select: auditEventSelect,
      }),
    ]);

    const alerts: DashboardAlert[] = tokens.flatMap((token) =>
      token.expiresAt
        ? [
            {
              type:
                token.expiresAt <= now ? ("token_expired" as const) : ("token_expiring" as const),
              projectSlug: token.project.slug,
              projectName: token.project.name,
              tokenName: token.name,
              expiresAt: token.expiresAt.toISOString(),
            },
          ]
        : [],
    );
    if (pendingInvitations > 0)
      alerts.push({ type: "pending_invitations", count: pendingInvitations });

    const byDay = new Map<string, ActivityDay>(
      days.map((date) => [date, { date, reads: 0, changes: 0 }]),
    );
    for (const event of events) {
      const day = byDay.get(event.createdAt.toISOString().slice(0, 10));
      if (!day) continue;
      if (READS.has(event.action)) day.reads++;
      else if (CHANGES.has(event.action)) day.changes++;
    }

    return {
      projects,
      alerts,
      activity: { days: [...byDay.values()], recent: recent.flatMap(toAuditEventDtos) },
      setup: { members, pendingInvitations },
    };
  });
