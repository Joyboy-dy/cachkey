import { queryOptions } from "@tanstack/react-query";
import { authClient } from "./auth-client";

/**
 * Account data read from the browser (Better Auth client, same-origin cookies).
 * They only run in the browser: during SSR the client has no cookies and no absolute URL,
 * so pages render their loading state first and fetch once hydrated.
 */
const inBrowser = typeof window !== "undefined";
type AuthResult<T> = { data: T | null; error: { code?: string; status?: number } | null };

async function unwrap<T>(promise: Promise<AuthResult<T>>): Promise<T> {
  const { data, error } = await promise;
  if (error || data === null) throw Object.assign(new Error("auth request failed"), error ?? {});
  return data;
}

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: ["auth", "accounts"],
    queryFn: () => unwrap(authClient.listAccounts()),
    enabled: inBrowser,
  });

export const sessionsQueryOptions = () =>
  queryOptions({
    queryKey: ["auth", "sessions"],
    queryFn: () => unwrap(authClient.listSessions()),
    enabled: inBrowser,
  });

/** Adds a password to an account created with Google or GitHub (server-only in Better Auth). */
export async function setAccountPassword(
  newPassword: string,
  confirmPassword: string,
): Promise<{ error: { code?: string; status?: number } | null }> {
  try {
    const response = await fetch("/api/account/set-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newPassword, confirmPassword }),
    });
    if (response.ok) return { error: null };
    const body = (await response.json().catch(() => ({}))) as { code?: string };
    return { error: { code: body.code, status: response.status } };
  } catch {
    return { error: { status: 0 } };
  }
}
