import { getRequestIP } from "@tanstack/react-start/server";

/** Internal URL of the Elysia API (never exposed to the browser). */
export function getApiUrl(): string {
  return process.env.API_INTERNAL_URL ?? "http://localhost:3001";
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
  const clientIp = getRequestIP({ xForwardedFor: true });
  if (clientIp) headers.set("x-forwarded-for", clientIp);

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
