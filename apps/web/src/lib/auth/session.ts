import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchApiAsVisitor } from "@/server/api";

const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullish(),
    emailVerified: z.boolean(),
    avatarSeed: z.string().nullish(),
    createdAt: z.string(),
  }),
  session: z.object({
    id: z.string(),
    expiresAt: z.string(),
    activeOrganizationId: z.string().nullish(),
  }),
});

export type AuthSession = z.infer<typeof sessionSchema>;

/** Reads the current session on the server (cookies and client IP forwarded to the API). */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthSession | null> => {
    const response = await fetchApiAsVisitor("/api/auth/get-session");
    if (!response?.ok) return null;
    const parsed = sessionSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  },
);

export const sessionQueryKey = ["auth", "session"] as const;

export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: sessionQueryKey,
    queryFn: () => getSession(),
    staleTime: 60_000,
  });

/**
 * Refreshes the session after a profile change: marks the cached session stale, then
 * re-runs route guards so `Route.useRouteContext().session` picks up the new values.
 */
export function useRefreshSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    await router.invalidate();
  };
}
