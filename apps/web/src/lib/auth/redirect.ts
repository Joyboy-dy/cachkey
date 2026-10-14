export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

/**
 * Accepts only same-origin relative paths to prevent open redirects
 * (`/foo` is allowed, `//evil.com` or `https://evil.com` are not).
 *
 * Browsers drop tabs and line breaks from URLs and read `\` as `/`, so `/<tab>/evil.com`
 * would become `//evil.com`: such characters are refused anywhere in the path.
 */
export function safeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  // eslint-disable-next-line no-control-regex -- control characters are exactly what is refused.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return undefined;
  const base = "http://cachkey.invalid";
  return new URL(value, base).origin === base ? value : undefined;
}
