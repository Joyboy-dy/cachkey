import { type Dashboard, dashboardSchema } from "@cachkey/shared";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { fetchApiAsVisitor } from "@/server/api";

/** Overview page data, in one request (see apps/api/src/dashboard.ts). */

const EMPTY: Dashboard = { projects: [], alerts: null, activity: null, setup: null };

export const getDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<Dashboard> => {
    const response = await fetchApiAsVisitor("/api/dashboard");
    if (!response?.ok) return EMPTY;
    const parsed = dashboardSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : EMPTY;
  },
);

export const dashboardQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: ["dashboard", organizationId],
    queryFn: () => getDashboard(),
    staleTime: 15_000,
  });
