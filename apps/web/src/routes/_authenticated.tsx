import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { sessionQueryOptions } from "@/lib/auth/session";

/** Every child route requires a valid session; the session is exposed in route context. */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions());
    if (!session) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
    return { session };
  },
  component: Outlet,
});
