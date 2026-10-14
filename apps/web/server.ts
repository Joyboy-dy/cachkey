/*
 * Production server of the web app (Bun). Serves the built client assets from dist/client
 * and hands every other request to the TanStack Start handler (SSR, server functions and the
 * /api/* gateway to the API).
 *
 * Bundled with its dependencies by `bun run build:server` into dist/serve.js, so the runtime
 * image needs no node_modules.
 */
import { join, normalize } from "node:path";
import handler from "./dist/server/server.js";

const port = Number(process.env.PORT ?? 3000);
const clientDir = join(import.meta.dir, "client");

/** A file of dist/client for this path, or null (never outside the directory). */
async function staticFile(pathname: string) {
  if (pathname === "/" || pathname.endsWith("/")) return null;
  const path = normalize(join(clientDir, decodeURIComponent(pathname)));
  if (!path.startsWith(clientDir)) return null;
  const file = Bun.file(path);
  return (await file.exists()) ? file : null;
}

Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" || request.method === "HEAD") {
      const file = await staticFile(pathname);
      if (file) {
        // Hashed build assets never change; other public files are revalidated.
        const immutable = pathname.startsWith("/assets/");
        return new Response(file, {
          headers: {
            "cache-control": immutable
              ? "public, max-age=31536000, immutable"
              : "public, max-age=3600",
          },
        });
      }
    }
    return handler.fetch(request);
  },
  error(error) {
    console.error(error);
    return new Response("Erreur interne du serveur.", { status: 500 });
  },
});

console.info(`Cachkey web listening on http://localhost:${port}`);
