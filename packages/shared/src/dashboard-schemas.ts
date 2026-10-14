import { z } from "zod";
import { auditEventDtoSchema } from "./collaboration-schemas";

/*
 * Overview page: what a user needs at a glance, nothing decorative.
 */

export const dashboardProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  permission: z.enum(["manage", "write", "read"]),
  environments: z.number(),
  variables: z.number(),
  /** Variables without a value, in the environments the viewer can see. */
  emptyVariables: z.number(),
  /** Last change of a variable, or of the project itself. */
  lastChangeAt: z.string(),
});
export type DashboardProject = z.infer<typeof dashboardProjectSchema>;

/** Something worth acting on. Labels are built by the web app from these facts. */
export const dashboardAlertSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("token_expiring"),
    projectSlug: z.string(),
    projectName: z.string(),
    tokenName: z.string(),
    expiresAt: z.string(),
  }),
  z.object({
    type: z.literal("token_expired"),
    projectSlug: z.string(),
    projectName: z.string(),
    tokenName: z.string(),
    expiresAt: z.string(),
  }),
  z.object({ type: z.literal("pending_invitations"), count: z.number() }),
]);
export type DashboardAlert = z.infer<typeof dashboardAlertSchema>;

export const activityDaySchema = z.object({
  /** YYYY-MM-DD (UTC). */
  date: z.string(),
  reads: z.number(),
  changes: z.number(),
});
export type ActivityDay = z.infer<typeof activityDaySchema>;

export const dashboardSchema = z.object({
  projects: z.array(dashboardProjectSchema),
  /** Owners and admins only (null for members). */
  alerts: z.array(dashboardAlertSchema).nullable(),
  activity: z
    .object({ days: z.array(activityDaySchema), recent: z.array(auditEventDtoSchema) })
    .nullable(),
  /** First steps: counts for owners and admins. */
  setup: z.object({ members: z.number(), pendingInvitations: z.number() }).nullable(),
});
export type Dashboard = z.infer<typeof dashboardSchema>;
