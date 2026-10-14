import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { getApiUrl } from "@/server/api";

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
  }),
});

export type AuthSession = z.infer<typeof sessionSchema>;

/**
 * Reads the current session on the server by forwarding the request cookies to the API.
 * Refreshed session cookies returned by Better Auth are passed back to the browser.
 */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthSession | null> => {
    const cookie = getRequestHeader("cookie");
    if (!cookie) return null;

    // Forward the client IP: Better Auth rate-limits per IP, and without it every
    // server-side session read would share a single counter.
    const headers = new Headers({ cookie });
    const clientIp = getRequestIP({ xForwardedFor: true });
    if (clientIp) headers.set("x-forwarded-for", clientIp);

    const response = await fetch(new URL("/api/auth/get-session", getApiUrl()), { headers });
    if (!response.ok) return null;

    const setCookies = response.headers.getSetCookie();
    if (setCookies.length > 0) setResponseHeader("set-cookie", setCookies);

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
