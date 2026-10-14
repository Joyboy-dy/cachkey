import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { sessionQueryOptions } from "@/lib/auth/session";
import { getSidebarOpen } from "@/lib/sidebar-state";
import { workspaceQueryOptions } from "@/lib/workspace";

/**
 * Every child route requires a valid session and an active organisation, and renders
 * inside the application shell. Without an organisation the user goes to /onboarding.
 */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions());
    if (!session) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
    const workspace = await context.queryClient.fetchQuery(workspaceQueryOptions());
    if (!workspace.active) {
      throw redirect({ to: "/onboarding" });
    }
    return { session, workspace, organization: workspace.active };
  },
  // Read once: afterwards SidebarProvider owns the state (and rewrites the cookie).
  loader: async () => ({ sidebarOpen: await getSidebarOpen() }),
  staleTime: Infinity,
  component: AppShell,
});

function AppShell() {
  const { session, workspace, organization } = Route.useRouteContext();
  const { sidebarOpen } = Route.useLoaderData();

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar user={session.user} workspace={workspace} organization={organization} />
      <SidebarInset className="min-w-0">
        <AppTopbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
