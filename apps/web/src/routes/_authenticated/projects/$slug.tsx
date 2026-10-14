import { canManage } from "@cachkey/shared";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, Outlet } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/app/page";
import { Icon } from "@/components/ui/icon";
import { textLinkVariants } from "@/components/ui/text-link";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { projectQueryOptions } from "@/lib/workspace";

/** Project layout: header and the « Variables / Paramètres » tabs. */
export const Route = createFileRoute("/_authenticated/projects/$slug")({
  loader: async ({ context, params }) => {
    const project = await context.queryClient.ensureQueryData(
      projectQueryOptions(context.organization.id, params.slug),
    );
    if (!project) throw notFound();
    // Second breadcrumb level in the top bar.
    return { crumb: project.name };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.crumb ?? "Projet"} · Cachkey` }],
  }),
  notFoundComponent: ProjectNotFound,
  component: ProjectLayout,
});

const tabClass =
  "inline-flex h-10 items-center border-b-2 border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground";

function ProjectLayout() {
  const { organization } = Route.useRouteContext();
  const { slug } = Route.useParams();
  const { data: project } = useSuspenseQuery(projectQueryOptions(organization.id, slug));

  if (!project) return <ProjectNotFound />;

  return (
    <PageContainer>
      <Link
        to="/projects"
        className={cn(
          textLinkVariants({ variant: "subtle" }),
          "mb-5 inline-flex items-center gap-1.5 text-sm",
        )}
      >
        <Icon icon={ArrowLeft01Icon} className="size-4" />
        Tous les projets
      </Link>
      <PageHeader
        title={project.name}
        description={project.description || `Créé le ${formatDate(project.createdAt)}.`}
      />

      <nav aria-label="Sections du projet" className="mt-6 mb-6 border-b">
        <ul className="-mb-px flex gap-6">
          <li>
            <Link
              to="/projects/$slug"
              params={{ slug }}
              activeOptions={{ exact: true, includeSearch: false }}
              className={tabClass}
            >
              Variables
            </Link>
          </li>
          {canManage(organization.role) ? (
            <li>
              <Link to="/projects/$slug/settings" params={{ slug }} className={tabClass}>
                Paramètres
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      <Outlet />
    </PageContainer>
  );
}

function ProjectNotFound() {
  return (
    <PageContainer>
      <PageHeader
        title="Projet introuvable"
        description="Ce projet n’existe pas, a été supprimé ou appartient à une autre organisation."
      />
      <Link to="/projects" className={cn(textLinkVariants(), "mt-6 inline-block text-sm")}>
        Voir tous les projets
      </Link>
    </PageContainer>
  );
}
