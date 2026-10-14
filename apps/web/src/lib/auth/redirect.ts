export const DEFAULT_AUTHENTICATED_PATH = "/welcome";

/**
 * Accepts only same-origin relative paths to prevent open redirects
 * (`/foo` is allowed, `//evil.com` or `https://evil.com` are not).
 */
export function safeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value;
}
