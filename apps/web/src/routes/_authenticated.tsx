import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { sessionQueryOptions } from "@/lib/auth/session";
import { getSidebarOpen } from "@/lib/sidebar-state";

/** Every child route requires a valid session and renders inside the application shell. */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions());
    if (!session) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
    return { session };
  },
  // Read once: afterwards SidebarProvider owns the state (and rewrites the cookie).
  loader: async () => ({ sidebarOpen: await getSidebarOpen() }),
  staleTime: Infinity,
  component: AppShell,
});

function AppShell() {
  const { session } = Route.useRouteContext();
  const { sidebarOpen } = Route.useLoaderData();

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar user={session.user} />
      <SidebarInset className="min-w-0">
        <AppTopbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
