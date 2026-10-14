import {
  canManage,
  canWrite,
  type MemberRole,
  memberRoles,
  type ProjectPermission,
} from "@cachkey/shared";
import { Elysia } from "elysia";
import { auth } from "./auth";
import { prisma } from "./db";

/*
 * Access checks shared by the business routes. Errors use Better Auth's `{ code, message }`
 * shape so the web app translates them the same way.
 */

export class HttpError extends Error {
  // Not named `status` / `code`: Elysia reads those properties for its own errors.
  constructor(
    readonly httpStatus: number,
    readonly errorCode: string,
  ) {
    super(errorCode);
  }
}

/** Organisation chosen per request by the CLI, instead of the session's active one. */
export const ORGANIZATION_HEADER = "x-cachkey-organization";

export function isMemberRole(value: string): value is MemberRole {
  return (memberRoles as readonly string[]).includes(value);
}

export async function requireSession(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new HttpError(401, "UNAUTHORIZED");
  return session;
}

/** Active organisation of the session and the caller's role in it. */
export async function requireMembership(headers: Headers) {
  const session = await requireSession(headers);
  // The CLI names the organisation of the linked folder; membership is still checked below.
  const organizationId =
    headers.get(ORGANIZATION_HEADER)?.trim() || session.session.activeOrganizationId;
  if (!organizationId) throw new HttpError(409, "NO_ACTIVE_ORGANIZATION");
  const member = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.user.id } },
    select: { role: true },
  });
  if (!member || !isMemberRole(member.role)) throw new HttpError(403, "FORBIDDEN");
  return {
    userId: session.user.id,
    userName: session.user.name,
    organizationId,
    role: member.role,
  };
}

export type Membership = Awaited<ReturnType<typeof requireMembership>>;

export async function requireManager(headers: Headers) {
  const membership = await requireMembership(headers);
  if (!canManage(membership.role)) throw new HttpError(403, "FORBIDDEN");
  return membership;
}

/** Turns a thrown HttpError into a `{ code, message }` JSON response. */
export const httpErrors = new Elysia({ name: "http-errors" })
  .error({ HttpError })
  .onError({ as: "scoped" }, ({ code, error }) => {
    if (code === "HttpError") {
      return Response.json(
        { code: error.errorCode, message: error.errorCode },
        { status: error.httpStatus },
      );
    }
  });

export async function findProject(organizationId: string, slug: string) {
  const project = await prisma.project.findUnique({
    where: { organizationId_slug: { organizationId, slug } },
  });
  if (!project) throw new HttpError(404, "PROJECT_NOT_FOUND");
  return project;
}

/** What `membership` may do in a project, and on which environments (null: all). */
export type ProjectGrant = { permission: ProjectPermission; environmentIds: string[] | null };

export async function grantFor(
  membership: Membership,
  projectId: string,
): Promise<ProjectGrant | null> {
  if (canManage(membership.role)) return { permission: "manage", environmentIds: null };
  const access = await prisma.projectAccess.findUnique({
    where: { projectId_userId: { projectId, userId: membership.userId } },
    select: { level: true, environmentIds: true },
  });
  if (!access) return null;
  return {
    permission: access.level === "write" ? "write" : "read",
    environmentIds: access.environmentIds.length ? access.environmentIds : null,
  };
}

export function coversEnvironment(grant: ProjectGrant, environmentId: string): boolean {
  return grant.environmentIds === null || grant.environmentIds.includes(environmentId);
}

const ranks: Record<ProjectPermission, number> = { read: 0, write: 1, manage: 2 };

/**
 * Project of the URL with the caller's grant. A project the caller cannot see answers 404,
 * like a missing one: its existence is not disclosed. Seen but not allowed: 403.
 */
export async function requireProject(
  headers: Headers,
  slug: string,
  needed: ProjectPermission = "read",
) {
  const membership = await requireMembership(headers);
  const project = await findProject(membership.organizationId, slug);
  const grant = await grantFor(membership, project.id);
  if (!grant) throw new HttpError(404, "PROJECT_NOT_FOUND");
  if (ranks[grant.permission] < ranks[needed]) throw new HttpError(403, "FORBIDDEN");
  return { membership, project, grant, canWrite: canWrite(grant.permission) };
}
