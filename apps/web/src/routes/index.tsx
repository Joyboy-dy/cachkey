import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { DEFAULT_AUTHENTICATED_PATH } from "@/lib/auth/redirect";
import { sessionQueryOptions } from "@/lib/auth/session";

const searchSchema = z.object({
  /**
   * Verification links re-sent at sign-in use the default callback ("/"):
   * Better Auth appends `?error=` here when such a link is invalid or expired.
   */
  error: z.string().optional().catch(undefined),
});

/** Entry point: no public landing page yet, route straight to the right place. */
export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  beforeLoad: async ({ context, search }) => {
    if (search.error) {
      throw redirect({ to: "/verify-email", search: { error: search.error } });
    }
    const session = await context.queryClient.fetchQuery(sessionQueryOptions());
    throw redirect({ to: session ? DEFAULT_AUTHENTICATED_PATH : "/sign-in" });
  },
});
