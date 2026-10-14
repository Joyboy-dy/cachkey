import { Link, useLocation } from "@tanstack/react-router";
import { Logo, LogoSymbol } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icon";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AuthSession } from "@/lib/auth/session";
import { canManage, type Workspace } from "@cachkey/shared";
import { findNavItem, NAV_SECTIONS } from "./navigation";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

type AppSidebarProps = {
  user: AuthSession["user"];
  workspace: Workspace;
  organization: NonNullable<Workspace["active"]>;
};

export function AppSidebar({ user, workspace, organization }: AppSidebarProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const activeItem = findNavItem(pathname);
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <Link
          to="/dashboard"
          aria-label="Cachkey, vue d’ensemble"
          className="flex items-center group-data-[collapsible=icon]:justify-center"
          onClick={() => setOpenMobile(false)}
        >
          <Logo className="w-[150px] group-data-[collapsible=icon]:hidden" />
          <LogoSymbol className="hidden h-7 w-auto group-data-[collapsible=icon]:block" />
        </Link>
      </SidebarHeader>

      <div className="px-2 pt-1 pb-2">
        <OrgSwitcher workspace={workspace} active={organization} />
      </div>

      <SidebarContent className="pt-1">
        {NAV_SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {section.items
                  .filter((item) => !item.managersOnly || canManage(organization.role))
                  .map((item) => {
                    const isActive = item === activeItem;
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className="relative h-9 text-sidebar-foreground before:absolute before:inset-y-2 before:-left-2 before:w-[3px] before:rounded-r-full before:bg-primary before:opacity-0 before:transition-opacity group-data-[collapsible=icon]:before:hidden data-[active=true]:before:opacity-100 data-[active=true]:[&>svg]:text-primary"
                        >
                          <Link
                            to={item.to}
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => setOpenMobile(false)}
                          >
                            <Icon icon={item.icon} />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
