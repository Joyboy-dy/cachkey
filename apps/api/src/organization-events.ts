import { renderInvitation } from "@cachkey/emails";
import { APIError } from "better-auth/api";
import { prisma } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./email";
import { env } from "./env";

/*
 * Side effects of organisation changes made through Better Auth: invitation emails,
 * audit events and clean-up of project accesses when someone leaves.
 */

const ROLE_NAMES: Record<string, string> = {
  owner: "propriétaire",
  admin: "administrateur",
  member: "membre",
};

function roleName(role: string | null | undefined): string {
  return ROLE_NAMES[role ?? "member"] ?? "membre";
}

type Named = { id: string; name: string };

export async function sendInvitation(data: {
  id: string;
  email: string;
  role: string;
  organization: Named;
  inviter: { user: Named };
}) {
  await sendEmail(
    data.email,
    await renderInvitation({
      appUrl: env.APP_URL,
      inviterName: data.inviter.user.name,
      organizationName: data.organization.name,
      roleLabel: roleName(data.role),
      acceptUrl: `${env.APP_URL}/invitation/${encodeURIComponent(data.id)}`,
    }),
  );
}

/** Project accesses only make sense while the person is a member. */
async function revokeProjectAccess(organizationId: string, userId: string) {
  await prisma.projectAccess.deleteMany({ where: { userId, project: { organizationId } } });
}

export const organizationHooks = {
  /**
   * Ownership only changes through the dedicated transfer (workspace.ts): never by a role
   * change, and an owner's role is never changed directly.
   */
  beforeUpdateMemberRole: async ({
    member,
    newRole,
  }: {
    member: { role: string };
    newRole: string;
  }) => {
    if (newRole === "owner" || member.role === "owner") {
      throw new APIError("FORBIDDEN", {
        code: "OWNERSHIP_TRANSFER_REQUIRED",
        message: "OWNERSHIP_TRANSFER_REQUIRED",
      });
    }
  },

  beforeCreateInvitation: async ({ invitation }: { invitation: { role: string } }) => {
    if (invitation.role !== "admin" && invitation.role !== "member") {
      throw new APIError("FORBIDDEN", {
        code: "OWNER_ROLE_NOT_INVITABLE",
        message: "OWNER_ROLE_NOT_INVITABLE",
      });
    }
  },

  afterCreateInvitation: async ({
    invitation,
    inviter,
    organization,
  }: {
    invitation: { email: string; role: string | null };
    inviter: Named;
    organization: { id: string };
  }) => {
    await audit(
      { organizationId: organization.id, userId: inviter.id, userName: inviter.name },
      {
        action: "member.invited",
        target: invitation.email,
        details: { role: invitation.role ?? "member" },
      },
    );
  },

  afterCancelInvitation: async ({
    invitation,
    cancelledBy,
    organization,
  }: {
    invitation: { email: string };
    cancelledBy: Named;
    organization: { id: string };
  }) => {
    await audit(
      { organizationId: organization.id, userId: cancelledBy.id, userName: cancelledBy.name },
      { action: "member.invitation_canceled", target: invitation.email },
    );
  },

  afterAcceptInvitation: async ({
    member,
    user,
    organization,
  }: {
    member: { role: string };
    user: Named & { email: string };
    organization: { id: string };
  }) => {
    await audit(
      { organizationId: organization.id, userId: user.id, userName: user.name },
      { action: "member.joined", target: user.email, details: { role: member.role } },
    );
  },
};

type MemberLike = { userId: string; organizationId: string; role?: string };

function asMember(value: unknown): MemberLike | null {
  if (!value || typeof value !== "object") return null;
  const candidate = "member" in value ? (value as { member: unknown }).member : value;
  if (
    candidate &&
    typeof candidate === "object" &&
    "userId" in candidate &&
    "organizationId" in candidate &&
    typeof candidate.userId === "string" &&
    typeof candidate.organizationId === "string"
  ) {
    const role =
      "role" in candidate && typeof candidate.role === "string" ? candidate.role : undefined;
    return { userId: candidate.userId, organizationId: candidate.organizationId, role };
  }
  return null;
}

/**
 * Called from Better Auth's `after` hook, where the acting session is known (the
 * organisation hooks for these actions do not say who did it).
 */
export async function afterMembershipChange(
  path: string,
  returned: unknown,
  actor: Named | undefined,
  request?: Request,
) {
  if (!actor || returned instanceof Error) return;
  const member = asMember(returned);
  if (!member) return;
  const actorRef = {
    organizationId: member.organizationId,
    userId: actor.id,
    userName: actor.name,
  };

  if (path === "/organization/update-member-role") {
    const user = await prisma.user.findUnique({
      where: { id: member.userId },
      select: { email: true },
    });
    // Owners and admins see every project: per-project accesses become pointless.
    if (member.role === "owner" || member.role === "admin") {
      await revokeProjectAccess(member.organizationId, member.userId);
    }
    await audit(
      actorRef,
      {
        action: "member.role_changed",
        target: user?.email ?? null,
        details: { role: member.role ?? "member" },
      },
      request,
    );
    return;
  }

  if (path === "/organization/remove-member" || path === "/organization/leave") {
    await revokeProjectAccess(member.organizationId, member.userId);
    const left = path === "/organization/leave";
    const user = left
      ? null
      : await prisma.user.findUnique({ where: { id: member.userId }, select: { email: true } });
    await audit(
      actorRef,
      {
        action: left ? "member.left" : "member.removed",
        target: left ? null : (user?.email ?? null),
      },
      request,
    );
  }
}
