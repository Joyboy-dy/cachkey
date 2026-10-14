import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { getApiUrl } from "@/server/api";

const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullish(),
    emailVerified: z.boolean(),
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

    const response = await fetch(new URL("/api/auth/get-session", getApiUrl()), {
      headers: { cookie },
    });
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
