import { canManage, type EnvironmentDto, type ProjectDto } from "@cachkey/shared";
import { Add01Icon, Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  ConfirmByTypingDialog,
  ConfirmDialog,
  DangerAction,
  dangerTriggerClass,
} from "@/components/app/confirm";
import { SectionCard } from "@/components/app/page";
import { ProjectForm } from "@/components/projects/project-form";
import { EnvironmentNameDialog } from "@/components/secrets/environment-dialogs";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { environmentsApi, environmentsQueryOptions } from "@/lib/secrets";
import { projectQueryOptions, projectsApi } from "@/lib/workspace";

/** « Paramètres » tab: owners and admins only. */
export const Route = createFileRoute("/_authenticated/projects/$slug/settings")({
  beforeLoad: ({ context, params }) => {
    if (!canManage(context.organization.role)) {
      throw redirect({ to: "/projects/$slug", params: { slug: params.slug } });
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      environmentsQueryOptions(context.organization.id, params.slug),
    ),
  component: SettingsTab,
});

function SettingsTab() {
  const { organization } = Route.useRouteContext();
  const { slug } = Route.useParams();
  const { data: project } = useSuspenseQuery(projectQueryOptions(organization.id, slug));
  if (!project) return null;

  return (
    <div className="grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
      <GeneralCard project={project} />
      <EnvironmentsCard organizationId={organization.id} projectSlug={project.slug} />
      <DangerCard project={project} />
    </div>
  );
}

function GeneralCard({ project }: { project: ProjectDto }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (
    <SectionCard title="Général" description="Le nom et la description du projet.">
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

type EnvironmentDialog =
  | { type: "create" }
  | { type: "rename"; environment: EnvironmentDto }
  | { type: "delete"; environment: EnvironmentDto }
  | null;

function EnvironmentsCard({
  organizationId,
  projectSlug,
}: {
  organizationId: string;
  projectSlug: string;
}) {
  const queryClient = useQueryClient();
  const { data: environments } = useSuspenseQuery(
    environmentsQueryOptions(organizationId, projectSlug),
  );
  const [dialog, setDialog] = useState<EnvironmentDialog>(null);
  const environmentsKey = ["environments", organizationId, projectSlug];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: environmentsKey });
    setDialog(null);
  }

  const deleting = dialog?.type === "delete" ? dialog.environment : null;
  async function remove(): Promise<string | null> {
    if (!deleting) return null;
    const { error } = await environmentsApi.remove(projectSlug, deleting.slug);
    if (error) return getAuthErrorMessage(error);
    queryClient.removeQueries({
      queryKey: ["secrets", organizationId, projectSlug, deleting.slug],
    });
    await refresh();
    return null;
  }

  return (
    <div id="environnements" className="scroll-mt-24">
      <SectionCard
        title="Environnements"
        description="Chaque environnement a ses propres valeurs pour les mêmes variables."
        aside={
          <Button variant="outline" size="sm" onClick={() => setDialog({ type: "create" })}>
            <Icon icon={Add01Icon} />
            <span className="sr-only sm:not-sr-only">Nouvel environnement</span>
          </Button>
        }
      >
        {environments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">
            Aucun environnement pour l’instant.
          </p>
        ) : (
          <ul className="divide-y">
            {environments.map((environment) => (
              <li key={environment.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/projects/$slug"
                    params={{ slug: projectSlug }}
                    search={{ env: environment.slug }}
                    className="block truncate font-mono text-sm font-medium hover:underline"
                  >
                    {environment.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {environment.secretCount === 0
                      ? "Aucune variable"
                      : `${environment.secretCount} variable${environment.secretCount > 1 ? "s" : ""}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setDialog({ type: "rename", environment })}
                  aria-label={`Renommer ${environment.name}`}
                >
                  <Icon icon={PencilEdit02Icon} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDialog({ type: "delete", environment })}
                  aria-label={`Supprimer ${environment.name}`}
                >
                  <Icon icon={Delete02Icon} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <EnvironmentNameDialog
        open={dialog?.type === "create" || dialog?.type === "rename"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        environment={dialog?.type === "rename" ? dialog.environment : undefined}
        onSubmit={async (name) => {
          const { error } =
            dialog?.type === "rename"
              ? await environmentsApi.rename(projectSlug, dialog.environment.slug, { name })
              : await environmentsApi.create(projectSlug, { name });
          if (error) return error;
          await refresh();
          return null;
        }}
      />

      {/* An empty environment goes with one click; one with variables needs its name typed. */}
      <ConfirmDialog
        open={deleting !== null && deleting.secretCount === 0}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={`Supprimer ${deleting?.name ?? ""} ?`}
        description="Cet environnement ne contient aucune variable."
        confirmLabel="Supprimer"
        onConfirm={remove}
      />
      <ConfirmByTypingDialog
        open={deleting !== null && deleting.secretCount > 0}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={`Supprimer ${deleting?.name ?? ""} ?`}
        description="Cette action est définitive."
        consequences={
          deleting
            ? [
                `${deleting.secretCount} variable${deleting.secretCount > 1 ? "s" : ""} et leur historique seront supprimées.`,
                "Les applications qui les lisent ne pourront plus les récupérer.",
              ]
            : []
        }
        expected={deleting?.name ?? ""}
        confirmLabel="Supprimer l’environnement"
        onConfirm={remove}
      />
    </div>
  );
}

function DangerCard({ project }: { project: ProjectDto }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <SectionCard title="Zone sensible" className="border-destructive/30">
      <DangerAction
        title="Supprimer le projet"
        description="Le projet, ses environnements et toutes ses variables seront définitivement supprimés."
        action={
          <Button variant="outline" className={dangerTriggerClass} onClick={() => setOpen(true)}>
            Supprimer le projet
          </Button>
        }
      />
      <ConfirmByTypingDialog
        open={open}
        onOpenChange={setOpen}
        title="Supprimer le projet ?"
        description="Cette action est définitive et ne peut pas être annulée."
        consequences={[
          "Tous ses environnements et toutes leurs variables seront supprimés.",
          "L’historique des valeurs sera effacé.",
          "Les applications qui utilisent ces variables ne pourront plus les récupérer.",
        ]}
        expected={project.name}
        confirmLabel="Supprimer le projet"
        onConfirm={async () => {
          const { error } = await projectsApi.remove(project.slug);
          if (error) return getAuthErrorMessage(error);
          queryClient.removeQueries({ queryKey: ["projects"] });
          queryClient.removeQueries({ queryKey: ["environments"] });
          queryClient.removeQueries({ queryKey: ["secrets"] });
          await navigate({ to: "/projects", replace: true });
          return null;
        }}
      />
    </SectionCard>
  );
}
