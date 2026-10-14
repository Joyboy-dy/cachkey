import type { AuditAction } from "@cachkey/shared";
import { prisma } from "./db";

/*
 * Audit log writer. Events are written after the action succeeded; a failure to log is
 * reported but never breaks the user's action. Never pass a secret value here.
 */

export type AuditActor = { organizationId: string; userId: string | null; userName: string };

export type AuditEntry = {
  action: AuditAction;
  project?: { id: string; name: string } | null;
  environmentName?: string | null;
  target?: string | null;
  details?: Record<string, string | number | boolean>;
};

function requestMeta(request?: Request) {
  if (!request) return { ip: null, userAgent: null };
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  };
}

export async function audit(actor: AuditActor, entry: AuditEntry, request?: Request) {
  try {
    await prisma.auditEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.userId,
        actorName: actor.userName,
        action: entry.action,
        projectId: entry.project?.id ?? null,
        projectName: entry.project?.name ?? null,
        environmentName: entry.environmentName ?? null,
        target: entry.target ?? null,
        metadata: entry.details ?? undefined,
        ...requestMeta(request),
      },
    });
  } catch (error) {
    console.error(`[audit] Failed to record "${entry.action}"`, error);
  }
}
