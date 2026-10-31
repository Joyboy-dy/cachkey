import { type AuditAction, auditActions, type AuditEventDto } from "@cachkey/shared";
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
  brickName?: string | null;
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

function fromCli(request?: Request): boolean {
  return request?.headers.get("user-agent")?.startsWith("cachkey-cli/") ?? false;
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
        brickName: entry.brickName ?? null,
        target: entry.target ?? null,
        // Actions made from the CLI are told apart in the log.
        metadata: fromCli(request)
          ? { ...entry.details, via: "cli" }
          : (entry.details ?? undefined),
        ...requestMeta(request),
      },
    });
  } catch (error) {
    console.error(`[audit] Failed to record "${entry.action}"`, error);
  }
}

// ── Reading ────────────────────────────────────────────────────────────────

const auditActionSet = new Set<string>(auditActions);

export const auditEventSelect = {
  id: true,
  action: true,
  actorId: true,
  actorName: true,
  actor: { select: { name: true, avatarSeed: true } },
  projectName: true,
  environmentName: true,
  brickName: true,
  target: true,
  metadata: true,
  ip: true,
  createdAt: true,
} as const;

type AuditRow = {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string;
  actor: { name: string; avatarSeed: string | null } | null;
  projectName: string | null;
  environmentName: string | null;
  brickName: string | null;
  target: string | null;
  metadata: unknown;
  ip: string | null;
  createdAt: Date;
};

/** A stored event as sent to the web app (empty for actions this version does not know). */
export function toAuditEventDtos(row: AuditRow): AuditEventDto[] {
  if (!auditActionSet.has(row.action)) return [];
  const metadata = row.metadata;
  return [
    {
      id: row.id,
      action: row.action as AuditAction,
      actor: {
        id: row.actorId,
        // Current name when the account still exists, the recorded one otherwise.
        name: row.actor?.name ?? row.actorName,
        avatarSeed: row.actor?.avatarSeed ?? null,
      },
      projectName: row.projectName,
      environmentName: row.environmentName,
      brickName: row.brickName,
      target: row.target,
      details:
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? (Object.fromEntries(
              Object.entries(metadata).filter(
                ([, value]) =>
                  typeof value === "string" ||
                  typeof value === "number" ||
                  typeof value === "boolean",
              ),
            ) as Record<string, string | number | boolean>)
          : null,
      ip: row.ip,
      createdAt: row.createdAt.toISOString(),
    },
  ];
}
