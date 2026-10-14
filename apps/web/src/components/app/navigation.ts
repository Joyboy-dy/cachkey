import {
  Activity01Icon,
  Building03Icon,
  DashboardSquare01Icon,
  FolderLockedIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@/components/ui/icon";

export type NavItem = {
  label: string;
  to: "/dashboard" | "/projects" | "/organization" | "/activity" | "/account";
  icon: IconSvgElement;
  /** Shown to owners and admins only. */
  managersOnly?: boolean;
};

export type NavSection = { label: string; items: NavItem[] };

/**
 * Sidebar navigation, in display order. Labels are user-facing (French). The account pages
 * are reached from the avatar menu only (see `ACCOUNT_NAV_ITEM`).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Espace de travail",
    items: [
      { label: "Vue d’ensemble", to: "/dashboard", icon: DashboardSquare01Icon },
      { label: "Projets", to: "/projects", icon: FolderLockedIcon },
      { label: "Activité", to: "/activity", icon: Activity01Icon, managersOnly: true },
      { label: "Organisation", to: "/organization", icon: Building03Icon },
    ],
  },
];

/** Not in the sidebar, but still the owner of /account/* (breadcrumb). */
export const ACCOUNT_NAV_ITEM: NavItem = {
  label: "Mon compte",
  to: "/account",
  icon: UserCircleIcon,
};

/** Navigation entry owning `pathname`, used for the active state and the breadcrumb. */
export function findNavItem(pathname: string): NavItem | undefined {
  return [...NAV_SECTIONS.flatMap((section) => section.items), ACCOUNT_NAV_ITEM].find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
}

/** Sub-sections of « Mon compte », shown as tabs and as the second breadcrumb level. */
export const ACCOUNT_SECTIONS = [
  { label: "Profil", to: "/account" },
  { label: "Sécurité", to: "/account/security" },
  { label: "Appareils", to: "/account/sessions" },
] as const;

export function findAccountSection(pathname: string) {
  const path = pathname.replace(/\/$/, "");
  return ACCOUNT_SECTIONS.find((section) => section.to === path);
}
