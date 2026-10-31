import { type BrickDto, SHARED_BRICK_SLUG } from "@cachkey/shared";
import {
  ArrowDown01Icon,
  CubeIcon,
  Settings02Icon,
  Share08Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
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

/**
 * Brick selector of the « Variables » tab, next to the environment one. Only shown once a
 * project has a second brick; the shared variables come last.
 */
export function BrickSwitcher({
  projectSlug,
  bricks,
  current,
  manager,
}: {
  projectSlug: string;
  bricks: BrickDto[];
  /** Slug of the brick shown, `shared` for the shared variables. */
  current: string;
  manager: boolean;
}) {
  const shared = current === SHARED_BRICK_SLUG;
  const label = shared ? "Partagées" : (bricks.find((brick) => brick.slug === current)?.name ?? "");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 max-w-[min(14rem,100%)] justify-between gap-2"
          aria-label={
            shared
              ? "Variables partagées. Changer de brique"
              : `Brique : ${label}. Changer de brique`
          }
        >
          <Icon icon={shared ? Share08Icon : CubeIcon} className="text-muted-foreground" />
          <span className="truncate text-[13px]">{label}</span>
          <Icon icon={ArrowDown01Icon} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Briques du projet
        </DropdownMenuLabel>
        <div className="max-h-72 overflow-y-auto">
          {bricks.map((brick) => (
            <BrickItem
              key={brick.id}
              projectSlug={projectSlug}
              slug={brick.slug}
              active={brick.slug === current}
              icon={CubeIcon}
              label={brick.name}
            />
          ))}
        </div>
        <DropdownMenuSeparator />
        <BrickItem
          projectSlug={projectSlug}
          slug={SHARED_BRICK_SLUG}
          active={shared}
          icon={Share08Icon}
          label="Variables partagées"
          hint="Héritées par toutes les briques"
        />
        {manager ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/projects/$slug/settings" params={{ slug: projectSlug }} hash="briques">
                <Icon icon={Settings02Icon} />
                Gérer les briques
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BrickItem({
  projectSlug,
  slug,
  active,
  icon,
  label,
  hint,
}: {
  projectSlug: string;
  slug: string;
  active: boolean;
  icon: typeof CubeIcon;
  label: string;
  hint?: string;
}) {
  return (
    <DropdownMenuItem asChild>
      <Link
        to="/projects/$slug"
        params={{ slug: projectSlug }}
        search={(previous) => ({ ...previous, brick: slug })}
        aria-current={active ? "true" : undefined}
        className="flex items-center gap-2"
      >
        <Icon icon={Tick02Icon} className={active ? "text-primary" : "invisible"} aria-hidden />
        <Icon icon={icon} className="text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px]">{label}</span>
          {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
        </span>
      </Link>
    </DropdownMenuItem>
  );
}
