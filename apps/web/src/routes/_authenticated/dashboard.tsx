import { type DashboardAlert, type DashboardProject, canManage } from "@cachkey/shared";
import {
  Add01Icon,
  Alert02Icon,
  ArrowRight01Icon,
  FolderLockedIcon,
  Key01Icon,
  MailSend01Icon,
} from "@hugeicons/core-free-icons";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer, PageHeader, SectionCard, StatusPill } from "@/components/app/page";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { ACTIVITY_PANEL_SPACE, RecentActivity } from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { textLinkVariants } from "@/components/ui/text-link";
import { dashboardQueryOptions } from "@/lib/dashboard";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(dashboardQueryOptions(context.organization.id)),
  head: () => ({ meta: [{ title: "Vue d’ensemble · Cachkey" }] }),
  component: DashboardPage,
});

const PERMISSION_LABELS: Record<DashboardProject["permission"], string> = {
  manage: "Accès complet",
  write: "Lecture et écriture",
  read: "Lecture",
};

const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

/** « aujourd’hui », « hier », « il y a 5 jours », then the date. */
function since(value: string): string {
  const days = Math.round((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days < 7) return relative.format(-days, "day");
  return `le ${formatDate(value)}`;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

function DashboardPage() {
  const { session, organization } = Route.useRouteContext();
  const { user } = session;
  const { data } = useSuspenseQuery(dashboardQueryOptions(organization.id));
  const manager = canManage(organization.role);
  const firstName = user.name.split(" ")[0] || user.name;
  // Owners and admins only (null for members): the panel shows even when still empty.
  const activity = data.activity;
  const variables = data.projects.reduce((sum, project) => sum + project.variables, 0);

  return (
    <div className={cn(activity && ACTIVITY_PANEL_SPACE)}>
      <PageContainer>
        <PageHeader
          title={`Bonjour, ${firstName}`}
          description={
            data.projects.length === 0
              ? `Bienvenue dans ${organization.name}.`
              : `${plural(data.projects.length, "projet", "projets")} et ${plural(variables, "variable", "variables")} dans ${organization.name}.`
          }
          actions={
            manager ? (
              <Button asChild>
                <Link to="/projects">
                  <Icon icon={Add01Icon} />
                  Nouveau projet
                </Link>
              </Button>
            ) : null
          }
        />

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
            {data.alerts && data.alerts.length > 0 ? <Alerts alerts={data.alerts} /> : null}
            <Projects projects={data.projects} manager={manager} />
            {data.activity ? (
              <SectionCard
                title="Activité des 14 derniers jours"
                description="Consultations et modifications des variables, tous projets confondus."
                aside={
                  <Link
                    to="/activity"
                    className={cn(textLinkVariants(), "text-sm whitespace-nowrap")}
                  >
                    Journal complet
                  </Link>
                }
              >
                <div className="px-3 pt-2 sm:px-4">
                  <ActivityChart days={data.activity.days} />
                </div>
                <Legend />
              </SectionCard>
            ) : null}
          </div>
        </div>

        {activity ? <RecentActivity events={activity.recent} /> : null}
      </PageContainer>
    </div>
  );
}

function Legend() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-4 text-xs text-muted-foreground sm:px-6">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-foreground" aria-hidden />
        Consultations
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-primary" aria-hidden />
        Modifications
      </span>
    </p>
  );
}

/** What deserves action now: expiring access tokens, invitations waiting for an answer. */
function Alerts({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <SectionCard title="À surveiller" className="border-primary/40">
      <ul className="divide-y">
        {alerts.map((alert) => {
          if (alert.type === "pending_invitations") {
            return (
              <li key="invitations" className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <Icon icon={MailSend01Icon} className="size-4 shrink-0 text-muted-foreground" />
                <p className="min-w-0 flex-1 text-sm">
                  {plural(alert.count, "invitation attend", "invitations attendent")} une réponse.
                </p>
                <Link
                  to="/organization"
                  className={cn(textLinkVariants(), "text-sm whitespace-nowrap")}
                >
                  Voir
                </Link>
              </li>
            );
          }
          const expired = alert.type === "token_expired";
          return (
            <li
              key={`${alert.projectSlug}:${alert.tokenName}`}
              className="flex items-center gap-3 px-5 py-3 sm:px-6"
            >
              <Icon
                icon={expired ? Alert02Icon : Key01Icon}
                className={cn(
                  "size-4 shrink-0",
                  expired ? "text-destructive" : "text-muted-foreground",
                )}
              />
              <p className="min-w-0 flex-1 text-sm">
                Le jeton <span className="font-medium">{alert.tokenName}</span> de{" "}
                {alert.projectName}{" "}
                {expired
                  ? `a expiré le ${formatDate(alert.expiresAt)}`
                  : `expire ${expiresIn(alert.expiresAt)}`}
                .
              </p>
              <Link
                to="/projects/$slug/settings"
                params={{ slug: alert.projectSlug }}
                hash="jetons"
                className={cn(textLinkVariants(), "text-sm whitespace-nowrap")}
              >
                Gérer
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function expiresIn(value: string): string {
  const days = Math.round((new Date(value).getTime() - Date.now()) / 86_400_000);
  return relative.format(days, "day");
}

function Projects({ projects, manager }: { projects: DashboardProject[]; manager: boolean }) {
  return (
    <SectionCard
      title="Vos projets"
      aside={
        projects.length > 0 ? (
          <Link to="/projects" className={cn(textLinkVariants(), "text-sm whitespace-nowrap")}>
            Tout voir
          </Link>
        ) : null
      }
    >
      {projects.length === 0 ? (
        <div className="px-5 py-8 text-center sm:px-6">
          <p className="text-sm font-medium">Aucun projet pour l’instant</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-balance text-muted-foreground">
            {manager
              ? "Créez un projet par application, puis importez son fichier .env."
              : "Un administrateur vous partagera les projets dont vous avez besoin."}
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {projects.slice(0, 6).map((project) => (
            <li key={project.id}>
              <Link
                to="/projects/$slug"
                params={{ slug: project.slug }}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/60 sm:px-6"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Icon icon={FolderLockedIcon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-medium">{project.name}</span>
                    {project.permission !== "manage" ? (
                      <StatusPill>{PERMISSION_LABELS[project.permission]}</StatusPill>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs leading-5 text-muted-foreground">
                    {plural(project.environments, "environnement", "environnements")} ·{" "}
                    {plural(project.variables, "variable", "variables")}
                    {project.emptyVariables > 0 ? (
                      <span className="text-foreground">
                        {" "}
                        · {project.emptyVariables} sans valeur
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  Modifié {since(project.lastChangeAt)}
                </span>
                <Icon icon={ArrowRight01Icon} className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
