import { Link } from "@tanstack/react-router";
import {
  Loading03Icon,
  Logout03Icon,
  UnfoldMoreIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AuthSession } from "@/lib/auth/session";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { UserAvatar } from "./user-avatar";

/** Account entry at the bottom of the sidebar: identity, account page, sign-out. */
export function UserMenu({ user }: { user: AuthSession["user"] }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { signOut, isPending } = useSignOut();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
              aria-label={`Menu du compte de ${user.name}`}
            >
              <UserAvatar user={user} />
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <Icon icon={UnfoldMoreIcon} className="ml-auto text-muted-foreground" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="flex items-center gap-2.5 py-2 font-normal">
              <UserAvatar user={user} />
              <span className="grid min-w-0 leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/account" onClick={() => setOpenMobile(false)}>
                <Icon icon={UserCircleIcon} aria-hidden />
                Mon compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isPending}
              onSelect={(event) => {
                event.preventDefault();
                void signOut();
              }}
            >
              {isPending ? (
                <Icon icon={Loading03Icon} className="animate-spin" aria-hidden />
              ) : (
                <Icon icon={Logout03Icon} aria-hidden />
              )}
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
