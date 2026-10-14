import { Link, useLocation, useMatches } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { findAccountSection, findNavItem } from "./navigation";
import { ThemeToggle } from "./theme-toggle";

/** Second breadcrumb level: account section, or a `crumb` returned by the route's loader. */
function useSubCrumb(pathname: string, parent: string | undefined): string | undefined {
  const crumb = useMatches({
    select: (matches) => {
      const data: unknown = matches.at(-1)?.loaderData;
      return data && typeof data === "object" && "crumb" in data && typeof data.crumb === "string"
        ? data.crumb
        : undefined;
    },
  });
  if (parent === "/account") return findAccountSection(pathname)?.label;
  return crumb;
}

export function AppTopbar() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const current = findNavItem(pathname);
  const sub = useSubCrumb(pathname, current?.to);
  const label = current?.label ?? "Cachkey";

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <SidebarTrigger className="-ml-1.5 size-9 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-5" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          {sub && current ? (
            <>
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink asChild>
                  <Link to={current.to}>{label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate font-medium">{sub}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate font-medium">{label}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <ThemeToggle className="-mr-1.5 ml-auto" />
    </header>
  );
}
