import {
  type MemberDto,
  memberDtoSchema,
  type ProjectDto,
  projectDtoSchema,
  type ProjectInput,
  type Workspace,
  workspaceSchema,
} from "@cachkey/shared";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchApiAsVisitor } from "@/server/api";

/*
 * Organisations and projects. Reads go through server functions (they run during SSR and
 * are called over RPC from the browser); writes call the same-origin API directly.
 */

const EMPTY_WORKSPACE: Workspace = { organizations: [], active: null };

export const getWorkspace = createServerFn({ method: "GET" }).handler(
  async (): Promise<Workspace> => {
    const response = await fetchApiAsVisitor("/api/workspace");
    if (!response?.ok) return EMPTY_WORKSPACE;
    const parsed = workspaceSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : EMPTY_WORKSPACE;
  },
);

export const getProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectDto[]> => {
    const response = await fetchApiAsVisitor("/api/projects");
    if (!response?.ok) return [];
    const parsed = z.array(projectDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  },
);

/** Null when the project does not exist in the active organisation. */
export const getProject = createServerFn({ method: "GET" })
  .inputValidator(z.string().min(1).max(64))
  .handler(async ({ data: slug }): Promise<ProjectDto | null> => {
    const response = await fetchApiAsVisitor(`/api/projects/${encodeURIComponent(slug)}`);
    if (!response?.ok) return null;
    const parsed = projectDtoSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  });

export const getMembers = createServerFn({ method: "GET" }).handler(
  async (): Promise<MemberDto[]> => {
    const response = await fetchApiAsVisitor("/api/organization/members");
    if (!response?.ok) return [];
    const parsed = z.array(memberDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  },
);

export const membersQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: ["members", organizationId],
    queryFn: () => getMembers(),
    staleTime: 30_000,
  });

export const workspaceQueryOptions = () =>
  queryOptions({
    queryKey: ["workspace"],
    queryFn: () => getWorkspace(),
    staleTime: 60_000,
  });

export const projectsQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: ["projects", organizationId],
    queryFn: () => getProjects(),
    staleTime: 30_000,
  });

export const projectQueryOptions = (organizationId: string, slug: string) =>
  queryOptions({
    queryKey: ["projects", organizationId, slug],
    queryFn: () => getProject({ data: slug }),
    staleTime: 30_000,
  });

type ApiError = { code?: string; status?: number };
type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

async function send<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const code =
        json && typeof json === "object" && "code" in json && typeof json.code === "string"
          ? json.code
          : undefined;
      return { data: null, error: { code, status: response.status } };
    }
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: { status: 0 } };
  }
}

export const projectsApi = {
  create: (input: ProjectInput) => send<ProjectDto>("POST", "/api/projects", input),
  update: (slug: string, input: ProjectInput) =>
    send<ProjectDto>("PATCH", `/api/projects/${encodeURIComponent(slug)}`, input),
  remove: (slug: string) =>
    send<{ status: true }>("DELETE", `/api/projects/${encodeURIComponent(slug)}`),
};

/**
 * After switching, creating, renaming or leaving an organisation: refetch the workspace and
 * the session, drop cached projects, and re-run route guards.
 */
export function useRefreshWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    queryClient.removeQueries({ queryKey: ["projects"] });
    queryClient.removeQueries({ queryKey: ["members"] });
    await queryClient.invalidateQueries({ queryKey: ["workspace"] });
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
    await router.invalidate();
  };
}
