import {
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
 * Environments and variables of a project. Lists (never values) are read through server
 * functions; values are only fetched from the browser, on explicit reveal, and are never
 * put in the query cache.
 */

const slugInput = z.string().min(1).max(64);

export const getEnvironments = createServerFn({ method: "GET" })
  .inputValidator(slugInput)
  .handler(async ({ data: slug }): Promise<EnvironmentDto[]> => {
    const response = await fetchApiAsVisitor(
      `/api/projects/${encodeURIComponent(slug)}/environments`,
    );
    if (!response?.ok) return [];
    const parsed = z.array(environmentDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  });

export const getSecrets = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: slugInput, env: slugInput }))
  .handler(async ({ data }): Promise<SecretDto[]> => {
    const response = await fetchApiAsVisitor(`${environmentPath(data.slug, data.env)}/secrets`);
    if (!response?.ok) return [];
    const parsed = z.array(secretDtoSchema).safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  });

export const environmentsQueryOptions = (organizationId: string, slug: string) =>
  queryOptions({
    queryKey: ["environments", organizationId, slug],
    queryFn: () => getEnvironments({ data: slug }),
    staleTime: 30_000,
  });

export const secretsQueryOptions = (organizationId: string, slug: string, env: string) =>
  queryOptions({
    queryKey: ["secrets", organizationId, slug, env],
    queryFn: () => getSecrets({ data: { slug, env } }),
    staleTime: 15_000,
  });

function environmentPath(slug: string, env: string) {
  return `/api/projects/${encodeURIComponent(slug)}/environments/${encodeURIComponent(env)}`;
}

function secretPath(slug: string, env: string, id: string) {
  return `${environmentPath(slug, env)}/secrets/${encodeURIComponent(id)}`;
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
  import: (slug: string, env: string, input: ImportInput) =>
    request<ImportResult>("POST", `${environmentPath(slug, env)}/import`, input),
  export: (slug: string, env: string) =>
    request<{ filename: string; content: string }>("POST", `${environmentPath(slug, env)}/export`),
};

export const secretsApi = {
  create: (slug: string, env: string, input: SecretInput) =>
    request<SecretDto>("POST", `${environmentPath(slug, env)}/secrets`, input),
  update: (slug: string, env: string, id: string, input: SecretUpdateInput) =>
    request<Done>("PATCH", secretPath(slug, env, id), input),
  remove: (slug: string, env: string, id: string) =>
    request<Done>("DELETE", secretPath(slug, env, id)),
  reveal: (slug: string, env: string, id: string) =>
    request<{ value: string }>("POST", `${secretPath(slug, env, id)}/reveal`),
  versions: (slug: string, env: string, id: string) =>
    request<SecretVersionDto[]>("GET", `${secretPath(slug, env, id)}/versions`),
  revealVersion: (slug: string, env: string, id: string, version: number) =>
    request<{ value: string }>("POST", `${secretPath(slug, env, id)}/versions/${version}/reveal`),
  restoreVersion: (slug: string, env: string, id: string, version: number) =>
    request<Done>("POST", `${secretPath(slug, env, id)}/versions/${version}/restore`),
};
