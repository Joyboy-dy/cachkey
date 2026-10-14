import { createFileRoute } from "@tanstack/react-router";
import { FolderLockedIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { PageContainer, PageHeader, StatusPill } from "@/components/app/page";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projets · Cachkey" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Projets"
        description="Chaque projet regroupe les environnements et les secrets d’une application."
      />

      <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center sm:py-20">
        <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-foreground">
          <Icon icon={FolderLockedIcon} className="size-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg leading-7 font-semibold">Aucun projet pour l’instant</h2>
        <p className="mt-1.5 max-w-md text-sm leading-6 text-balance text-muted-foreground">
          La création de projets arrive dans une prochaine version de Cachkey. Vos projets
          apparaîtront ici.
        </p>
        <div className="mt-5">
          <StatusPill>Bientôt disponible</StatusPill>
        </div>
      </div>
    </PageContainer>
  );
}
