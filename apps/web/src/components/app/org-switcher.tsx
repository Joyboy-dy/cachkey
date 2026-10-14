import type { Workspace } from "@cachkey/shared";
import { Add01Icon, Tick02Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { OrgAvatar } from "@/components/organization/org-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/auth-client";
import { roleLabel } from "@/lib/roles";
import { useRefreshWorkspace } from "@/lib/workspace";

type ActiveOrganization = NonNullable<Workspace["active"]>;

/** Active organisation, quick switch between organisations and creation of a new one. */
export function OrgSwitcher({
  workspace,
  active,
}: {
  workspace: Workspace;
  active: ActiveOrganization;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const refreshWorkspace = useRefreshWorkspace();
  const [creating, setCreating] = useState(false);

  async function switchTo(organizationId: string) {
    if (organizationId === active.id) return;
    const { error } = await authClient.organization.setActive({ organizationId });
    if (error) return;
    setOpenMobile(false);
    await refreshWorkspace();
    await navigate({ to: "/dashboard" });
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="border bg-card group-data-[collapsible=icon]:border-transparent data-[state=open]:bg-sidebar-accent"
                tooltip={active.name}
                aria-label={`Organisation : ${active.name}. Changer d’organisation`}
              >
                <OrgAvatar id={active.id} />
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">
                    {active.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {roleLabel(active.role)}
                  </span>
                </span>
                <Icon icon={UnfoldMoreIcon} className="ml-auto text-muted-foreground" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="start"
              sideOffset={8}
            >
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Organisations
              </DropdownMenuLabel>
              {workspace.organizations.map((organization) => (
                <DropdownMenuItem
                  key={organization.id}
                  onSelect={() => void switchTo(organization.id)}
                  className="gap-2.5"
                >
                  <OrgAvatar id={organization.id} className="size-6 rounded-md" />
                  <span className="truncate">{organization.name}</span>
                  {organization.id === active.id ? (
                    <Icon icon={Tick02Icon} className="ml-auto" aria-label="Organisation active" />
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCreating(true)} className="gap-2.5">
                <span className="flex size-6 items-center justify-center rounded-md border border-dashed">
                  <Icon icon={Add01Icon} className="size-3.5" />
                </span>
                Nouvelle organisation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle organisation</DialogTitle>
            <DialogDescription>
              Une organisation regroupe des projets et les personnes qui y travaillent.
            </DialogDescription>
          </DialogHeader>
          <CreateOrganizationForm
            autoFocus
            onCreated={async () => {
              setCreating(false);
              setOpenMobile(false);
              await refreshWorkspace();
              await navigate({ to: "/dashboard" });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
