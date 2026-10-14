import { z } from "zod";
import { memberRoles } from "./workspace-schemas";

// ── Invitations ──────────────────────────────────────────────────────────────

/** Roles that can be given by invitation (ownership is transferred, never invited). */
export const invitableRoles = ["admin", "member"] as const;
export type InvitableRole = (typeof invitableRoles)[number];

export const invitationSchema = z.object({
  email: z.email("Adresse email invalide.").trim().toLowerCase(),
  role: z.enum(invitableRoles),
});
export type InvitationInput = z.infer<typeof invitationSchema>;

/** Invitation as shown to the invited person before accepting. */
export const invitationDetailsSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(memberRoles),
  status: z.enum(["pending", "accepted", "rejected", "canceled", "expired"]),
  organizationName: z.string(),
  inviterName: z.string(),
  expiresAt: z.string(),
});
export type InvitationDetails = z.infer<typeof invitationDetailsSchema>;

/** Invitation waiting for an answer, as listed to owners and admins. */
export const pendingInvitationDtoSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(invitableRoles),
  inviterName: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  expired: z.boolean(),
});
export type PendingInvitationDto = z.infer<typeof pendingInvitationDtoSchema>;

/** Hand the organisation over to another member (the current owner becomes admin). */
export const transferOwnershipSchema = z.object({
  userId: z.string().min(1).max(64),
  /** The organisation's exact name, typed as a confirmation. */
  confirmation: z.string().trim().min(1).max(100),
});
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

// ── Project access ───────────────────────────────────────────────────────────

/**
 * What a project gives its viewer: owners/admins `manage` everything; members get
 * `write` or `read` through an explicit access, or nothing (the project stays hidden).
 */
export const projectPermissions = ["manage", "write", "read"] as const;
export type ProjectPermission = (typeof projectPermissions)[number];

export const accessLevels = ["read", "write"] as const;
export type AccessLevel = (typeof accessLevels)[number];

export function canWrite(permission: ProjectPermission | null | undefined): boolean {
  return permission === "manage" || permission === "write";
}

export const projectAccessSchema = z.object({
  level: z.enum(accessLevels),
  /** Empty: every environment, including those created later. */
  environmentIds: z.array(z.string().min(1).max(64)).max(50),
});
export type ProjectAccessInput = z.infer<typeof projectAccessSchema>;

/** A member of the organisation and what they can do in one project. */
export const projectAccessDtoSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatarSeed: z.string().nullable(),
  }),
  role: z.enum(memberRoles),
  /** Null: no access (members only; owners and admins always manage). */
  access: projectAccessSchema.nullable(),
});
export type ProjectAccessDto = z.infer<typeof projectAccessDtoSchema>;

// ── Audit log ────────────────────────────────────────────────────────────────

export const auditActions = [
  "secret.revealed",
  "secret.version_revealed",
  "secret.created",
  "secret.updated",
  "secret.renamed",
  "secret.deleted",
  "secret.restored",
  "environment.imported",
  "environment.exported",
  "environment.pulled",
  "environment.created",
  "environment.renamed",
  "environment.deleted",
  "project.created",
  "project.updated",
  "project.deleted",
  "access.granted",
  "access.revoked",
  "member.invited",
  "member.invitation_canceled",
  "member.joined",
  "member.role_changed",
  "member.removed",
  "member.left",
  "member.ownership_transferred",
  "token.created",
  "token.revoked",
] as const;
export type AuditAction = (typeof auditActions)[number];

/** Families used to filter the log. */
export const auditCategories = {
  reads: [
    "secret.revealed",
    "secret.version_revealed",
    "environment.exported",
    "environment.pulled",
  ],
  changes: [
    "secret.created",
    "secret.updated",
    "secret.renamed",
    "secret.deleted",
    "secret.restored",
    "environment.imported",
  ],
  structure: [
    "environment.created",
    "environment.renamed",
    "environment.deleted",
    "project.created",
    "project.updated",
    "project.deleted",
  ],
  people: [
    "access.granted",
    "access.revoked",
    "member.invited",
    "member.invitation_canceled",
    "member.joined",
    "member.role_changed",
    "member.removed",
    "member.left",
    "member.ownership_transferred",
    "token.created",
    "token.revoked",
  ],
} as const satisfies Record<string, readonly AuditAction[]>;
export type AuditCategory = keyof typeof auditCategories;

export const auditQuerySchema = z.object({
  category: z.enum(["reads", "changes", "structure", "people"]).optional(),
  projectId: z.string().min(1).max(64).optional(),
  cursor: z.string().min(1).max(64).optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const auditEventDtoSchema = z.object({
  id: z.string(),
  action: z.enum(auditActions),
  actor: z.object({
    id: z.string().nullable(),
    name: z.string(),
    avatarSeed: z.string().nullable(),
  }),
  projectName: z.string().nullable(),
  environmentName: z.string().nullable(),
  target: z.string().nullable(),
  /** Free-form details already safe to show (counts, roles…). Never a secret value. */
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditEventDto = z.infer<typeof auditEventDtoSchema>;

export const auditPageSchema = z.object({
  events: z.array(auditEventDtoSchema),
  nextCursor: z.string().nullable(),
});
export type AuditPage = z.infer<typeof auditPageSchema>;
