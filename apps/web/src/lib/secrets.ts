import {
  type BrickDto,
  brickDtoSchema,
  type BrickInput,
  type EnvironmentDto,
  environmentDtoSchema,
  type EnvironmentInput,
  type ImportInput,
  type ImportResult,
  type SecretDto,
  secretDtoSchema,
  type SecretInput,
  type SecretUpdateInput,
  type SecretVersionDto,
} from "@cachkey/shared";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchApiAsVisitor } from "@/server/api";
import { request } from "./workspace";

/*
 * Environments, bricks and variables of a project. Lists (never values) are read through
 * server functions; values are only fetched from the browser, on explicit reveal, and are
 * never put in the query cache.
 */

const slugInput = z.string().min(1).max(64);

/** Where variables are read and written: project, environment and brick (main by default). */
export type SecretScope = { slug: string; env: string; brick?: string };

/** `?brick=` of the API, left out for the main brick. */
function brickQuery(brick: string | undefined): string {
  return brick ? `?brick=${encodeURIComponent(brick)}` : "";
}

export const getEnvironments = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: slugInput, brick: slugInput.optional() }))
  .handler(async ({ data }): Promise<EnvironmentDto[]> => {
    const response = await fetchApiAsVisitor(
      `/api/projects/${encodeURIComponent(data.slug)}/environments${brickQuery(data.brick)}`,
    );
    if (!response?.ok) return [];
    const parsed = z.array(environmentDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  });

export const getBricks = createServerFn({ method: "GET" })
  .inputValidator(slugInput)
  .handler(async ({ data: slug }): Promise<BrickDto[]> => {
    const response = await fetchApiAsVisitor(`/api/projects/${encodeURIComponent(slug)}/bricks`);
    if (!response?.ok) return [];
    const parsed = z.array(brickDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  });

export const getSecrets = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: slugInput, env: slugInput, brick: slugInput.optional() }))
  .handler(async ({ data }): Promise<SecretDto[]> => {
    const response = await fetchApiAsVisitor(
      `${environmentPath(data.slug, data.env)}/secrets${brickQuery(data.brick)}`,
    );
    if (!response?.ok) return [];
    const parsed = z.array(secretDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  });

/** `secretCount` counts the variables of `brick` when given, of every brick otherwise. */
export const environmentsQueryOptions = (organizationId: string, slug: string, brick?: string) =>
  queryOptions({
    queryKey: ["environments", organizationId, slug, brick ?? null],
    queryFn: () => getEnvironments({ data: { slug, brick } }),
    staleTime: 30_000,
  });

export const bricksQueryOptions = (organizationId: string, slug: string) =>
  queryOptions({
    queryKey: ["bricks", organizationId, slug],
    queryFn: () => getBricks({ data: slug }),
    staleTime: 30_000,
  });

export const secretsQueryOptions = (organizationId: string, scope: SecretScope) =>
  queryOptions({
    queryKey: ["secrets", organizationId, scope.slug, scope.env, scope.brick ?? null],
    queryFn: () => getSecrets({ data: scope }),
    staleTime: 15_000,
  });

function environmentPath(slug: string, env: string) {
  return `/api/projects/${encodeURIComponent(slug)}/environments/${encodeURIComponent(env)}`;
}

function scopePath(scope: SecretScope, path: string) {
  return `${environmentPath(scope.slug, scope.env)}${path}${brickQuery(scope.brick)}`;
}

function secretPath(scope: SecretScope, id: string, path = "") {
  return scopePath(scope, `/secrets/${encodeURIComponent(id)}${path}`);
}

type Done = { status: true };

export const environmentsApi = {
  create: (slug: string, input: EnvironmentInput) =>
    request<EnvironmentDto>(
      "POST",
      `/api/projects/${encodeURIComponent(slug)}/environments`,
      input,
    ),
  rename: (slug: string, env: string, input: EnvironmentInput) =>
    request<Done>("PATCH", environmentPath(slug, env), input),
  remove: (slug: string, env: string) => request<Done>("DELETE", environmentPath(slug, env)),
  import: (scope: SecretScope, input: ImportInput) =>
    request<ImportResult>("POST", scopePath(scope, "/import"), input),
  /** The brick's variables merged over the shared ones, as the application receives them. */
  export: (scope: SecretScope) =>
    request<{ filename: string; content: string }>("POST", scopePath(scope, "/export")),
};

function brickPath(slug: string, brick?: string) {
  const base = `/api/projects/${encodeURIComponent(slug)}/bricks`;
  return brick ? `${base}/${encodeURIComponent(brick)}` : base;
}

export const bricksApi = {
  create: (slug: string, input: BrickInput) => request<BrickDto>("POST", brickPath(slug), input),
  rename: (slug: string, brick: string, input: BrickInput) =>
    request<BrickDto>("PATCH", brickPath(slug, brick), input),
  remove: (slug: string, brick: string) => request<Done>("DELETE", brickPath(slug, brick)),
};

export const secretsApi = {
  create: (scope: SecretScope, input: SecretInput) =>
    request<SecretDto>("POST", scopePath(scope, "/secrets"), input),
  update: (scope: SecretScope, id: string, input: SecretUpdateInput) =>
    request<Done>("PATCH", secretPath(scope, id), input),
  remove: (scope: SecretScope, id: string) => request<Done>("DELETE", secretPath(scope, id)),
  reveal: (scope: SecretScope, id: string) =>
    request<{ value: string }>("POST", secretPath(scope, id, "/reveal")),
  versions: (scope: SecretScope, id: string) =>
    request<SecretVersionDto[]>("GET", secretPath(scope, id, "/versions")),
  revealVersion: (scope: SecretScope, id: string, version: number) =>
    request<{ value: string }>("POST", secretPath(scope, id, `/versions/${version}/reveal`)),
  restoreVersion: (scope: SecretScope, id: string, version: number) =>
    request<Done>("POST", secretPath(scope, id, `/versions/${version}/restore`)),
};
