import { canManage, type EnvironmentDto } from "@cachkey/shared";
import { Layers01Icon } from "@hugeicons/core-free-icons";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { EnvironmentSwitcher } from "@/components/secrets/environment-switcher";
import { SecretsPanel } from "@/components/secrets/secrets-panel";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { environmentsQueryOptions, secretsQueryOptions } from "@/lib/secrets";

const searchSchema = z.object({ env: z.string().min(1).max(64).optional().catch(undefined) });

/** « Variables » tab: one environment at a time, chosen in the selector (`?env=`). */
export const Route = createFileRoute("/_authenticated/projects/$slug/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ env: search.env }),
  loader: async ({ context, params, deps }) => {
    const { queryClient, organization } = context;
    const environments = await queryClient.ensureQueryData(
      environmentsQueryOptions(organization.id, params.slug),
    );
    const environment = pickEnvironment(environments, deps.env);
    if (environment) {
      await queryClient.ensureQueryData(
        secretsQueryOptions(organization.id, params.slug, environment.slug),
      );
    }
  },
  component: VariablesTab,
});

/** Environment of the URL, or the first one when absent or unknown. */
function pickEnvironment(environments: EnvironmentDto[], slug: string | undefined) {
  return environments.find((environment) => environment.slug === slug) ?? environments[0];
}

function VariablesTab() {
  const { organization } = Route.useRouteContext();
  const { slug } = Route.useParams();
  const { env } = Route.useSearch();
  const { data: environments } = useSuspenseQuery(environmentsQueryOptions(organization.id, slug));
  const manager = canManage(organization.role);
  const environment = pickEnvironment(environments, env);

  if (!environment) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-14 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
          <Icon icon={Layers01Icon} className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold">Aucun environnement</h2>
        <p className="mt-1 max-w-sm text-sm leading-6 text-balance text-muted-foreground">
          {manager
            ? "Créez un environnement (development, production…) pour y ranger vos variables."
            : "Un administrateur doit d’abord créer un environnement pour ce projet."}
        </p>
        {manager ? (
          <Button asChild className="mt-5">
            <Link to="/projects/$slug/settings" params={{ slug }} hash="environnements">
              Créer un environnement
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <SecretsPanel
      key={environment.id}
      organizationId={organization.id}
      projectSlug={slug}
      environment={environment}
      switcher={
        <EnvironmentSwitcher
          organizationId={organization.id}
          projectSlug={slug}
          environments={environments}
          current={environment}
          manager={manager}
        />
      }
    />
  );
}
