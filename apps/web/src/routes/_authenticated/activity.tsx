import { type AuditCategory, type AuditEventDto, canManage } from "@cachkey/shared";
import { Activity01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AuditEventRow } from "@/components/activity/audit-event";
import { PageContainer, PageHeader } from "@/components/app/page";
import { ScrollRow } from "@/components/app/scroll-row";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auditProjectsQueryOptions, auditQueryOptions } from "@/lib/collaboration";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  category: z.enum(["reads", "changes", "structure", "people"]).optional().catch(undefined),
  project: z.string().min(1).max(64).optional().catch(undefined),
});

/** Organisation audit log: who read or changed what, and when (owners and admins). */
export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    if (!canManage(context.organization.role)) throw redirect({ to: "/dashboard" });
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const { queryClient, organization } = context;
    await Promise.all([
      queryClient.ensureInfiniteQueryData(
        auditQueryOptions(organization.id, { category: deps.category, projectId: deps.project }),
      ),
      queryClient.ensureQueryData(auditProjectsQueryOptions(organization.id)),
    ]);
  },
  head: () => ({ meta: [{ title: "Activité · Cachkey" }] }),
  component: ActivityPage,
});

/** Radix Select cannot use an empty value: sentinel for « all projects ». */
const ALL_PROJECTS = "__all__";

const CATEGORIES: { value: AuditCategory | undefined; label: string }[] = [
  { value: undefined, label: "Tout" },
  { value: "reads", label: "Consultations" },
  { value: "changes", label: "Modifications" },
  { value: "structure", label: "Projets et environnements" },
  { value: "people", label: "Membres et accès" },
];

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd’hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  const label = dayFormat.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupByDay(events: AuditEventDto[]) {
  const groups: { key: string; label: string; events: AuditEventDto[] }[] = [];
  for (const event of events) {
    const date = new Date(event.createdAt);
    const key = date.toDateString();
    const last = groups.at(-1);
    if (last?.key === key) last.events.push(event);
    else groups.push({ key, label: dayLabel(date), events: [event] });
  }
  return groups;
}

function ActivityPage() {
  const { organization } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: projects } = useSuspenseQuery(auditProjectsQueryOptions(organization.id));
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } =
    useSuspenseInfiniteQuery(
      auditQueryOptions(organization.id, { category: search.category, projectId: search.project }),
    );
  const events = data.pages.flatMap((page) => page.events);
  const filtered = Boolean(search.category || search.project);

  return (
    <PageContainer>
      <PageHeader
        title="Activité"
        description={`Qui a consulté ou modifié quoi dans ${organization.name}, et quand. Chaque affichage d’une valeur est enregistré.`}
      />

      <div className="mt-8 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {/* One line at every size: scrolls sideways when it does not fit. */}
        <ScrollRow
          label="Type d’activité"
          className="-mx-4 px-4 sm:mx-0 sm:px-0 xl:min-w-0 xl:flex-1"
        >
          {CATEGORIES.map((category) => {
            const active = search.category === category.value;
            return (
              <button
                key={category.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  void navigate({
                    search: (previous) => ({ ...previous, category: category.value }),
                  })
                }
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
              >
                {category.label}
              </button>
            );
          })}
        </ScrollRow>
        <div className="flex items-center gap-2 text-sm">
          <span id="activity-project" className="shrink-0 text-muted-foreground">
            Projet
          </span>
          <Select
            value={search.project ?? ALL_PROJECTS}
            onValueChange={(value) =>
              void navigate({
                search: (previous) => ({
                  ...previous,
                  project: value === ALL_PROJECTS ? undefined : value,
                }),
              })
            }
          >
            <SelectTrigger
              size="sm"
              aria-labelledby="activity-project"
              className="h-9 w-full min-w-0 sm:w-64"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL_PROJECTS}>Tous les projets</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={cn("mt-5 transition-opacity", isRefetching && "opacity-60")}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
              <Icon icon={Activity01Icon} className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold">
              {filtered ? "Aucune activité pour ces filtres" : "Aucune activité pour l’instant"}
            </h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-balance text-muted-foreground">
              {filtered
                ? "Essayez un autre type d’activité ou un autre projet."
                : "Les consultations et modifications de variables apparaîtront ici."}
            </p>
            {filtered ? (
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => void navigate({ search: {} })}
              >
                Effacer les filtres
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            {groupByDay(events).map((group) => (
              <section key={group.key} aria-label={group.label}>
                <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </h2>
                <ul className="divide-y rounded-xl border bg-card">
                  {group.events.map((event) => (
                    <AuditEventRow key={event.id} event={event} />
                  ))}
                </ul>
              </section>
            ))}
            {hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <Icon icon={Loading03Icon} className="animate-spin" />
                  ) : null}
                  Afficher plus d’activité
                </Button>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Début du journal pour ces filtres.
              </p>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
