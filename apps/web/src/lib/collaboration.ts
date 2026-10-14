import {
  type AuditCategory,
  type AuditPage,
  auditPageSchema,
  type InvitationDetails,
  invitationDetailsSchema,
  type PendingInvitationDto,
  pendingInvitationDtoSchema,
  type ProjectAccessDto,
  projectAccessDtoSchema,
  type ProjectAccessInput,
  type CreatedServiceToken,
  type ServiceTokenDto,
  serviceTokenDtoSchema,
  type ServiceTokenInput,
} from "@cachkey/shared";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchApiAsVisitor } from "@/server/api";
import { request } from "./workspace";

/*
 * Invitations, project accesses and the audit log. Reads go through server functions;
 * writes call the same-origin API (or Better Auth's organization client for invitations).
 */

// ── Invitations ──────────────────────────────────────────────────────────────

export const getOrganizationInvitations = createServerFn({ method: "GET" }).handler(
  async (): Promise<PendingInvitationDto[]> => {
    const response = await fetchApiAsVisitor("/api/organization/invitations");
    if (!response?.ok) return [];
    const parsed = z.array(pendingInvitationDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  },
);

export const organizationInvitationsQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: ["invitations", organizationId],
    queryFn: () => getOrganizationInvitations(),
    staleTime: 15_000,
  });

export const getMyInvitations = createServerFn({ method: "GET" }).handler(
  async (): Promise<InvitationDetails[]> => {
    const response = await fetchApiAsVisitor("/api/invitations");
    if (!response?.ok) return [];
    const parsed = z.array(invitationDetailsSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  },
);

export const myInvitationsQueryOptions = () =>
  queryOptions({
    queryKey: ["invitations", "mine"],
    queryFn: () => getMyInvitations(),
    staleTime: 15_000,
  });

export type InvitationLookup =
  | { invitation: InvitationDetails; error: null }
  | { invitation: null; error: "not_found" | "other_email" | "signed_out" };

export const getInvitation = createServerFn({ method: "GET" })
  .inputValidator(z.string().min(1).max(64))
  .handler(async ({ data: id }): Promise<InvitationLookup> => {
    const response = await fetchApiAsVisitor(`/api/invitations/${encodeURIComponent(id)}`);
    if (response?.status === 401) return { invitation: null, error: "signed_out" };
    if (response?.status === 403) return { invitation: null, error: "other_email" };
    if (!response?.ok) return { invitation: null, error: "not_found" };
    const parsed = invitationDetailsSchema.safeParse(await response.json());
    return parsed.success
      ? { invitation: parsed.data, error: null }
      : { invitation: null, error: "not_found" };
  });

// ── Project access ───────────────────────────────────────────────────────────

export const getProjectAccess = createServerFn({ method: "GET" })
  .inputValidator(z.string().min(1).max(64))
  .handler(async ({ data: slug }): Promise<ProjectAccessDto[]> => {
    const response = await fetchApiAsVisitor(`/api/projects/${encodeURIComponent(slug)}/access`);
    if (!response?.ok) return [];
    const parsed = z.array(projectAccessDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  });

export const projectAccessQueryOptions = (organizationId: string, slug: string) =>
  queryOptions({
    queryKey: ["access", organizationId, slug],
    queryFn: () => getProjectAccess({ data: slug }),
    staleTime: 15_000,
  });

const accessPath = (slug: string, userId: string) =>
  `/api/projects/${encodeURIComponent(slug)}/access/${encodeURIComponent(userId)}`;

export const accessApi = {
  set: (slug: string, userId: string, input: ProjectAccessInput) =>
    request<{ status: true }>("PUT", accessPath(slug, userId), input),
  remove: (slug: string, userId: string) =>
    request<{ status: true }>("DELETE", accessPath(slug, userId)),
};

// ── Service tokens ───────────────────────────────────────────────────────────

export const getServiceTokens = createServerFn({ method: "GET" })
  .inputValidator(z.string().min(1).max(64))
  .handler(async ({ data: slug }): Promise<ServiceTokenDto[]> => {
    const response = await fetchApiAsVisitor(`/api/projects/${encodeURIComponent(slug)}/tokens`);
    if (!response?.ok) return [];
    const parsed = z.array(serviceTokenDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  });

export const serviceTokensQueryOptions = (organizationId: string, slug: string) =>
  queryOptions({
    queryKey: ["tokens", organizationId, slug],
    queryFn: () => getServiceTokens({ data: slug }),
    staleTime: 15_000,
  });

const tokensPath = (slug: string) => `/api/projects/${encodeURIComponent(slug)}/tokens`;

export const tokensApi = {
  /** The full token is in the response, once: it never goes to the query cache. */
  create: (slug: string, input: ServiceTokenInput) =>
    request<CreatedServiceToken>("POST", tokensPath(slug), input),
  revoke: (slug: string, id: string) =>
    request<{ status: true }>("DELETE", `${tokensPath(slug)}/${encodeURIComponent(id)}`),
};

// ── Audit log ────────────────────────────────────────────────────────────────

const auditFilters = z.object({
  category: z.enum(["reads", "changes", "structure", "people"]).optional(),
  projectId: z.string().min(1).max(64).optional(),
  cursor: z.string().min(1).max(64).optional(),
});

const EMPTY_PAGE: AuditPage = { events: [], nextCursor: null };

export const getAuditPage = createServerFn({ method: "GET" })
  .inputValidator(auditFilters)
  .handler(async ({ data }): Promise<AuditPage> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) if (value) params.set(key, value);
    const response = await fetchApiAsVisitor(`/api/audit?${params}`);
    if (!response?.ok) return EMPTY_PAGE;
    const parsed = auditPageSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : EMPTY_PAGE;
  });

export const auditQueryOptions = (
  organizationId: string,
  filters: { category?: AuditCategory; projectId?: string },
) =>
  infiniteQueryOptions({
    queryKey: ["audit", organizationId, filters],
    queryFn: ({ pageParam }) =>
      getAuditPage({ data: { ...filters, cursor: pageParam ?? undefined } }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 10_000,
  });

export const getAuditProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ id: string; name: string }[]> => {
    const response = await fetchApiAsVisitor("/api/audit/projects");
    if (!response?.ok) return [];
    const parsed = z
      .array(z.object({ id: z.string(), name: z.string() }))
      .safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  },
);

export const auditProjectsQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: ["audit-projects", organizationId],
    queryFn: () => getAuditProjects(),
    staleTime: 60_000,
  });

// ── Overview ─────────────────────────────────────────────────────────────────

const overviewSchema = z.object({
  secrets: z.number(),
  members: z.number(),
  pendingInvitations: z.number(),
});
export type OrganizationOverview = z.infer<typeof overviewSchema>;

export const getOrganizationOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<OrganizationOverview | null> => {
    const response = await fetchApiAsVisitor("/api/organization/overview");
    if (!response?.ok) return null;
    const parsed = overviewSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  },
);

export const organizationOverviewQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: ["overview", organizationId],
    queryFn: () => getOrganizationOverview(),
    staleTime: 30_000,
  });
