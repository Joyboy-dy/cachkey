import { publicConfigSchema, type PublicConfig } from "@cachkey/shared";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getApiUrl } from "@/server/api";

/** Instance configuration that drives the UI (e.g. which OAuth buttons to show). */
export const getPublicConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicConfig> => {
    try {
      const response = await fetch(new URL("/api/config", getApiUrl()));
      return publicConfigSchema.parse(await response.json());
    } catch {
      return { socialProviders: [] };
    }
  },
);

export const publicConfigQueryOptions = () =>
  queryOptions({
    queryKey: ["public-config"],
    queryFn: () => getPublicConfig(),
    staleTime: Number.POSITIVE_INFINITY,
  });
