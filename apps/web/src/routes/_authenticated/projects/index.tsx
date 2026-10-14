import { canManage } from "@cachkey/shared";
import { FolderLockedIcon } from "@hugeicons/core-free-icons";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/app/page";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { Icon } from "@/components/ui/icon";
import { formatDate } from "@/lib/date";
import { projectsQueryOptions } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/projects/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(projectsQueryOptions(context.organization.id)),
  head: () => ({ meta: [{ title: "Projets · Cachkey" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { organization } = Route.useRouteContext();
  const { data: projects } = useSuspenseQuery(projectsQueryOptions(organization.id));
  const manager = canManage(organization.role);

  return (
    <PageContainer>
      <PageHeader
        title="Projets"
        description={`Les projets de ${organization.name}. Chacun regroupe les environnements et les secrets d’une application.`}
        actions={manager && projects.length > 0 ? <NewProjectDialog /> : null}
      />

      {projects.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center sm:py-20">
          <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-foreground">
            <Icon icon={FolderLockedIcon} className="size-6" />
          </span>
          <h2 className="mt-5 text-lg leading-7 font-semibold">Aucun projet pour l’instant</h2>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-balance text-muted-foreground">
            {manager
              ? "Créez un premier projet pour une application, un site ou un service."
              : "Les projets qu’un administrateur partagera avec vous apparaîtront ici."}
          </p>
          {manager ? (
            <div className="mt-6">
              <NewProjectDialog />
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to="/projects/$slug"
                params={{ slug: project.slug }}
                className="group flex h-full flex-col rounded-xl border bg-card p-5 transition-[border-color,box-shadow] duration-200 hover:border-foreground/25 hover:shadow-[0_8px_24px_-16px_rgb(26_26_26/0.25)]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors group-hover:text-primary">
                    <Icon icon={FolderLockedIcon} className="size-[18px]" />
                  </span>
                  <span className="min-w-0 truncate text-base font-semibold">{project.name}</span>
                </span>
                <span className="mt-3 line-clamp-2 flex-1 text-sm leading-5 text-muted-foreground">
                  {project.description || "Aucune description."}
                </span>
                <span className="mt-4 text-xs text-muted-foreground">
                  Modifié le {formatDate(project.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
