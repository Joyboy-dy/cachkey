import { canManage, type MemberRole, memberRoles } from "@cachkey/shared";
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
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new HttpError(409, "NO_ACTIVE_ORGANIZATION");
  const member = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.user.id } },
    select: { role: true },
  });
  if (!member || !isMemberRole(member.role)) throw new HttpError(403, "FORBIDDEN");
  return { userId: session.user.id, organizationId, role: member.role };
}

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
