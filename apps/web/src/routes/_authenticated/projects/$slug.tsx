import { canManage, type ProjectDto } from "@cachkey/shared";
import { ArrowLeft01Icon, Layers01Icon } from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { PageContainer, PageHeader, SectionCard, StatusPill } from "@/components/app/page";
import { useAppForm } from "@/components/form/form";
import { ProjectForm } from "@/components/projects/project-form";
import { Icon } from "@/components/ui/icon";
import { textLinkVariants } from "@/components/ui/text-link";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { projectQueryOptions, projectsApi } from "@/lib/workspace";

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
  component: ProjectPage,
});

function ProjectPage() {
  const { organization } = Route.useRouteContext();
  const { slug } = Route.useParams();
  const { data: project } = useSuspenseQuery(projectQueryOptions(organization.id, slug));
  const manager = canManage(organization.role);

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

      <div className="mt-8 grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
        <SectionCard
          title="Environnements et secrets"
          description="Développement, préproduction, production… chacun avec ses propres valeurs."
          aside={<StatusPill>Bientôt</StatusPill>}
        >
          <div className="flex items-center gap-4 px-5 py-6 sm:px-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
              <Icon icon={Layers01Icon} className="size-5" />
            </span>
            <p className="text-sm leading-6 text-muted-foreground">
              La gestion chiffrée des variables d’environnement de ce projet arrive dans la
              prochaine version de Cachkey.
            </p>
          </div>
        </SectionCard>

        {manager ? (
          <>
            <ProjectSettingsCard project={project} />
            <DeleteProjectCard project={project} />
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}

function ProjectSettingsCard({ project }: { project: ProjectDto }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (
    <SectionCard title="Paramètres" description="Le nom et la description du projet.">
      <ProjectForm
        layout="card"
        initial={project}
        submitLabel="Enregistrer"
        successMessage="Le projet a été mis à jour."
        onSubmit={async (input) => {
          const { error } = await projectsApi.update(project.slug, input);
          if (error) return error;
          await queryClient.invalidateQueries({ queryKey: ["projects"] });
          await router.invalidate();
          return null;
        }}
      />
    </SectionCard>
  );
}

function DeleteProjectCard({ project }: { project: ProjectDto }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const schema = z.object({
    confirmation: z
      .string()
      .trim()
      .refine((value) => value === project.name, {
        message: "Saisissez le nom exact du projet pour confirmer.",
      }),
  });

  const form = useAppForm({
    defaultValues: { confirmation: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: async () => {
      setFeedback(null);
      const { error } = await projectsApi.remove(project.slug);
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      queryClient.removeQueries({ queryKey: ["projects"] });
      await navigate({ to: "/projects", replace: true });
    },
  });

  return (
    <SectionCard
      title="Supprimer le projet"
      description="Le projet et tout ce qu’il contient seront définitivement supprimés."
      className="border-destructive/30"
    >
      <form.AppForm>
        <form.Form>
          <div className="grid gap-5 px-5 py-5 sm:px-6">
            <FeedbackAlert feedback={feedback} />
            <form.AppField name="confirmation">
              {(field) => (
                <field.TextField
                  label={`Saisissez « ${project.name} » pour confirmer`}
                  autoComplete="off"
                />
              )}
            </form.AppField>
          </div>
          <div className="flex justify-end border-t px-5 py-3.5 sm:px-6">
            <form.SubmitButton size="default" variant="destructive" className="w-full sm:w-auto">
              Supprimer le projet
            </form.SubmitButton>
          </div>
        </form.Form>
      </form.AppForm>
    </SectionCard>
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
