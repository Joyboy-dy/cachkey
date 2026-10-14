import { createFileRoute } from "@tanstack/react-router";
import { proxyToApi } from "@/server/api";

/** Same-origin gateway: every /api/* request is forwarded to the Elysia API. */
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      ANY: ({ request }) => proxyToApi(request),
    },
  },
});
