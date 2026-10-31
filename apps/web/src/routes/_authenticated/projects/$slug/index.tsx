import {
  type BrickDto,
  canManage,
  canWrite,
  type EnvironmentDto,
  SHARED_BRICK_SLUG,
} from "@cachkey/shared";
import { Layers01Icon } from "@hugeicons/core-free-icons";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { BrickSwitcher } from "@/components/secrets/brick-switcher";
import { EnvironmentSwitcher } from "@/components/secrets/environment-switcher";
import { SecretsPanel } from "@/components/secrets/secrets-panel";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { bricksQueryOptions, environmentsQueryOptions, secretsQueryOptions } from "@/lib/secrets";
import { projectQueryOptions } from "@/lib/workspace";

const searchSchema = z.object({
  env: z.string().min(1).max(64).optional().catch(undefined),
  brick: z.string().min(1).max(64).optional().catch(undefined),
});

/**
 * « Variables » tab: one environment at a time, chosen in the selector (`?env=`). Projects
 * split into bricks also show one brick at a time (`?brick=`, `shared` for the shared
 * variables); the others never see the notion. A project back to a single brick keeps the
 * selector while shared variables remain: they are still delivered with the main brick.
 */
export const Route = createFileRoute("/_authenticated/projects/$slug/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ env: search.env, brick: search.brick }),
  loader: async ({ context, params, deps }) => {
    const { queryClient, organization } = context;
    const bricks = await queryClient.ensureQueryData(
      bricksQueryOptions(organization.id, params.slug),
    );
    const shared =
      bricks.length < 2
        ? await queryClient.ensureQueryData(sharedOptions(organization.id, params.slug))
        : [];
    const brick = pickBrick(bricks, hasShared(shared), deps.brick)?.slug;
    const environments = await queryClient.ensureQueryData(
      environmentsQueryOptions(organization.id, params.slug, brick),
    );
    const environment = pickEnvironment(environments, deps.env);
    if (environment) {
      await queryClient.ensureQueryData(
        secretsQueryOptions(organization.id, { slug: params.slug, env: environment.slug, brick }),
      );
    }
  },
  component: VariablesTab,
});

/** Environment of the URL, or the first one when absent or unknown. */
function pickEnvironment(environments: EnvironmentDto[], slug: string | undefined) {
  return environments.find((environment) => environment.slug === slug) ?? environments[0];
}

/** Environments counted in the shared variables, to know whether any remain. */
function sharedOptions(organizationId: string, slug: string) {
  return environmentsQueryOptions(organizationId, slug, SHARED_BRICK_SLUG);
}

function hasShared(environments: EnvironmentDto[] | undefined) {
  return (environments ?? []).some((environment) => environment.secretCount > 0);
}

/**
 * Brick of the URL (the main one when absent or unknown), or null for a project that has
 * a single brick and no shared variable: the API then uses the main brick.
 */
function pickBrick(bricks: BrickDto[], shared: boolean, slug: string | undefined) {
  if (bricks.length < 2 && !shared) return null;
  if (slug === SHARED_BRICK_SLUG) return { slug, name: "Variables partagées" };
  const brick = bricks.find((item) => item.slug === slug) ?? bricks.find((item) => item.main);
  return brick ? { slug: brick.slug, name: brick.name } : null;
}

function VariablesTab() {
  const { organization } = Route.useRouteContext();
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const { data: bricks } = useSuspenseQuery(bricksQueryOptions(organization.id, slug));
  // Loaded with the route for single-brick projects only (see the loader).
  const { data: shared } = useQuery({
    ...sharedOptions(organization.id, slug),
    enabled: bricks.length < 2,
  });
  const brick = pickBrick(bricks, bricks.length < 2 && hasShared(shared), search.brick);
  const { data: environments } = useSuspenseQuery(
    environmentsQueryOptions(organization.id, slug, brick?.slug),
  );
  const { data: project } = useSuspenseQuery(projectQueryOptions(organization.id, slug));
  const manager = canManage(organization.role);
  const environment = pickEnvironment(environments, search.env);

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
            : "Aucun environnement de ce projet ne vous est partagé pour l’instant."}
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
      key={`${environment.id}:${brick?.slug ?? ""}`}
      organizationId={organization.id}
      projectSlug={slug}
      environment={environment}
      brick={brick}
      canWrite={canWrite(project?.permission)}
      switcher={
        <>
          {brick ? (
            <BrickSwitcher
              projectSlug={slug}
              bricks={bricks}
              current={brick.slug}
              manager={manager}
            />
          ) : null}
          <EnvironmentSwitcher
            organizationId={organization.id}
            projectSlug={slug}
            environments={environments}
            current={environment}
            manager={manager}
          />
        </>
      }
    />
  );
}
