import { getRequestHeader, getRequestIP, setResponseHeader } from "@tanstack/react-start/server";

/** Internal URL of the Elysia API (never exposed to the browser). */
export function getApiUrl(): string {
  return process.env.API_INTERNAL_URL ?? "http://localhost:3001";
}

/**
 * Address of the visitor, for Better Auth's per-IP rate limiting.
 *
 * In production the app sits behind a TLS reverse proxy that appends the address it sees to
 * `X-Forwarded-For`. Only that last entry is trustworthy: anything before it was sent by the
 * client and could be forged to dodge the limits. Without the header: the socket address.
 */
function clientIp(): string | undefined {
  const forwarded = getRequestHeader("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || getRequestIP() || undefined;
}

const HOP_BY_HOP_HEADERS = ["host", "connection", "keep-alive", "transfer-encoding", "upgrade"];

/**
 * Forwards a browser request to the API so that the app and `/api/*` share one origin
 * (first-party cookies, no CORS). The client IP is forwarded for Better Auth rate limiting.
 */
export async function proxyToApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, getApiUrl());

  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  const ip = clientIp();
  if (ip) headers.set("x-forwarded-for", ip);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  // fetch() already decoded the body: drop headers describing the original encoding.
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/**
 * Server-side GET to the API on behalf of the current visitor: forwards their cookies and
 * IP (Better Auth rate-limits per IP), and passes refreshed session cookies back.
 * Returns null when the visitor has no cookie at all.
 */
export async function fetchApiAsVisitor(path: string): Promise<Response | null> {
  const cookie = getRequestHeader("cookie");
  if (!cookie) return null;
  const headers = new Headers({ cookie });
  const ip = clientIp();
  if (ip) headers.set("x-forwarded-for", ip);

  const response = await fetch(new URL(path, getApiUrl()), { headers });
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length > 0) setResponseHeader("set-cookie", setCookies);
  return response;
}
