import type { EnvironmentDto } from "@cachkey/shared";
import {
  Add01Icon,
  ArrowDown01Icon,
  Layers01Icon,
  Settings02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { environmentsApi } from "@/lib/secrets";
import { EnvironmentNameDialog } from "./environment-dialogs";

/**
 * Environment selector of the « Variables » tab. A menu scales to any number of
 * environments, keeps the toolbar on one line, and shows each one's variable count.
 */
export function EnvironmentSwitcher({
  organizationId,
  projectSlug,
  environments,
  current,
  manager,
}: {
  organizationId: string;
  projectSlug: string;
  environments: EnvironmentDto[];
  current: EnvironmentDto;
  manager: boolean;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 max-w-[min(16rem,100%)] justify-between gap-2"
            aria-label={`Environnement : ${current.name}. Changer d’environnement`}
          >
            <Icon icon={Layers01Icon} className="text-muted-foreground" />
            <span className="truncate font-mono text-[13px]">{current.name}</span>
            <Icon icon={ArrowDown01Icon} className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            Environnements
          </DropdownMenuLabel>
          <div className="max-h-72 overflow-y-auto">
            {environments.map((environment) => {
              const active = environment.id === current.id;
              return (
                <DropdownMenuItem key={environment.id} asChild>
                  <Link
                    to="/projects/$slug"
                    params={{ slug: projectSlug }}
                    search={{ env: environment.slug }}
                    aria-current={active ? "true" : undefined}
                    className="flex items-center gap-2"
                  >
                    <Icon
                      icon={Tick02Icon}
                      className={active ? "text-primary" : "invisible"}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                      {environment.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {environment.secretCount}
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
          {manager ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCreating(true)}>
                <Icon icon={Add01Icon} />
                Nouvel environnement
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/projects/$slug/settings" params={{ slug: projectSlug }}>
                  <Icon icon={Settings02Icon} />
                  Gérer les environnements
                </Link>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {manager ? (
        <EnvironmentNameDialog
          open={creating}
          onOpenChange={setCreating}
          onSubmit={async (name) => {
            const { data, error } = await environmentsApi.create(projectSlug, { name });
            if (error) return error;
            await queryClient.invalidateQueries({
              queryKey: ["environments", organizationId, projectSlug],
            });
            setCreating(false);
            await navigate({
              to: "/projects/$slug",
              params: { slug: projectSlug },
              search: { env: data.slug },
            });
            return null;
          }}
        />
      ) : null}
    </>
  );
}
