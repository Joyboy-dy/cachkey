import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/auth-shell";
import { DEFAULT_AUTHENTICATED_PATH, safeRedirectPath } from "@/lib/auth/redirect";
import { sessionQueryOptions } from "@/lib/auth/session";

/** Pages reserved to visitors without a session (sign-in, sign-up, password recovery). */
export const Route = createFileRoute("/_guest")({
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions());
    if (session) {
      const target = "redirect" in search ? safeRedirectPath(search.redirect) : undefined;
      throw redirect({ href: target ?? DEFAULT_AUTHENTICATED_PATH });
    }
  },
  component: GuestLayout,
});

function GuestLayout() {
  return (
    <AuthShell>
      <Outlet />
    </AuthShell>
  );
}
