import type { AuditEventDto } from "@cachkey/shared";
import {
  Activity01Icon,
  ArrowRight02Icon,
  ArrowUp01Icon,
  CommandLineIcon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ActorAvatar,
  describeEvent,
  eventContext,
  fromCli,
} from "@/components/activity/audit-event";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Icon } from "@/components/ui/icon";
import { textLinkVariants } from "@/components/ui/text-link";
import { cn } from "@/lib/utils";

/*
 * Recent activity of the organisation, as a timeline.
 *
 * - Wide screens (xl+): a panel detached on the right, under the top bar, always visible.
 *   The page leaves room for it (see `ACTIVITY_PANEL_SPACE`).
 * - Smaller screens: a handle at the bottom of the screen; a tap or an upward swipe opens a
 *   bottom sheet with the same timeline (drag it down to close).
 */

/** Room the page leaves for the panel (xl+, on the right) or its handle (below, at the bottom). */
export const ACTIVITY_PANEL_SPACE = "max-xl:pb-16 xl:pr-[22rem]";

const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto", style: "short" });

/** « à l’instant », « il y a 12 min », « il y a 3 h », « hier »… */
function ago(value: string): string {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  if (seconds > -45) return "à l’instant";
  if (seconds > -3600) return relative.format(Math.round(seconds / 60), "minute");
  if (seconds > -86_400) return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86_400), "day");
}

/** `surface`: background behind the timeline, so the avatar rings cut the thread cleanly. */
function Timeline({
  events,
  surface,
}: {
  events: AuditEventDto[];
  surface: "card" | "background";
}) {
  return (
    <ol className="relative">
      {events.map((event, index) => {
        const context = eventContext(event);
        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-1">
            {/* The thread joining the avatars. */}
            {index < events.length - 1 ? (
              <span aria-hidden className="absolute top-8 bottom-0 left-[13px] w-px bg-border" />
            ) : null}
            <ActorAvatar
              event={event}
              className={cn(
                "relative size-7 ring-4",
                surface === "card" ? "ring-card" : "ring-background",
              )}
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] leading-5 text-muted-foreground">
                <span className="font-medium text-foreground">{event.actor.name}</span>{" "}
                {describeEvent(event)}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-muted-foreground">
                <time
                  dateTime={event.createdAt}
                  title={new Date(event.createdAt).toLocaleString("fr-FR")}
                >
                  {ago(event.createdAt)}
                </time>
                {context ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{context}</span>
                  </>
                ) : null}
                {fromCli(event) ? (
                  <span
                    className="inline-flex items-center"
                    title="En ligne de commande"
                    aria-label="En ligne de commande"
                  >
                    <Icon icon={CommandLineIcon} className="size-3.5" />
                  </span>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function JournalLink({ className }: { className?: string }) {
  return (
    <Link
      to="/activity"
      className={cn(textLinkVariants(), "inline-flex items-center gap-1.5 text-sm", className)}
    >
      Journal complet
      <Icon icon={ArrowRight02Icon} className="size-4" aria-hidden />
    </Link>
  );
}

/** Shown to owners and admins, even before anything happened (empty state). */
export function RecentActivity({ events }: { events: AuditEventDto[] }) {
  return (
    <>
      <ActivityPanel events={events} />
      <ActivitySheet events={events} />
    </>
  );
}

/** xl+: detached panel on the right, below the top bar (h-16 + gap). */
function ActivityPanel({ events }: { events: AuditEventDto[] }) {
  return (
    <aside
      aria-labelledby="activity-panel-title"
      className="animate-brand-in fixed top-20 right-4 bottom-4 z-20 hidden w-80 flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] xl:flex"
    >
      <header className="flex items-baseline justify-between gap-3 px-5 pt-5 pb-3">
        <h2 id="activity-panel-title" className="text-sm font-semibold">
          Activité récente
        </h2>
        <span className="text-xs text-muted-foreground">Toute l’organisation</span>
      </header>
      {/* Content fades out at both ends instead of being cut. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-24px),transparent)] px-5 pt-2 pb-4">
        {events.length > 0 ? <Timeline events={events} surface="card" /> : <EmptyActivity />}
      </div>
      {events.length > 0 ? (
        <footer className="border-t px-5 py-3">
          <JournalLink />
        </footer>
      ) : null}
    </aside>
  );
}

/** Below xl: a handle that opens a bottom sheet (tap, or swipe up on the handle). */
function ActivitySheet({ events }: { events: AuditEventDto[] }) {
  const [open, setOpen] = useState(false);
  const start = useRef<number | null>(null);
  // The click that ends a swipe must not toggle the sheet closed again.
  const swiped = useRef(false);
  const actors = [...new Map(events.map((event) => [event.actor.name, event])).values()].slice(
    0,
    3,
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          onPointerDown={(event) => {
            start.current = event.clientY;
            swiped.current = false;
          }}
          onClick={(event) => {
            if (swiped.current) event.preventDefault();
          }}
          onPointerMove={(event) => {
            // An upward swipe on the handle opens the sheet, like pulling it.
            if (start.current !== null && start.current - event.clientY > 24) {
              start.current = null;
              swiped.current = true;
              setOpen(true);
            }
          }}
          onPointerUp={() => {
            start.current = null;
          }}
          className="fixed bottom-4 left-1/2 z-30 flex h-11 -translate-x-1/2 touch-none items-center gap-2.5 rounded-full border bg-card/95 pr-4 pl-1.5 text-sm font-medium whitespace-nowrap shadow-lg backdrop-blur outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 xl:hidden"
          aria-label="Afficher l’activité récente"
        >
          {actors.length > 0 ? (
            <span className="flex -space-x-2">
              {actors.map((event) => (
                <ActorAvatar key={event.id} event={event} className="size-8 ring-2 ring-card" />
              ))}
            </span>
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary">
              <Icon icon={Activity01Icon} className="size-4 text-muted-foreground" />
            </span>
          )}
          Activité récente
          <Icon icon={ArrowUp01Icon} className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85svh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Activité récente</DrawerTitle>
          <DrawerDescription>Les dernières actions dans toute l’organisation.</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pt-1 pb-2">
          {events.length > 0 ? (
            <Timeline events={events} surface="background" />
          ) : (
            <EmptyActivity />
          )}
        </div>
        {events.length > 0 ? (
          <DrawerFooter className="border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
            <JournalLink className="justify-center" />
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Nothing recorded yet. A quiet illustration of the timeline to come (inline SVG, theme
 * tokens only, so it follows light and dark modes), then what will appear here.
 */
function EmptyActivity() {
  return (
    <div className="m-auto flex flex-col items-center px-2 py-10 text-center">
      <svg
        viewBox="0 0 160 112"
        className="h-28 w-40 text-muted-foreground"
        aria-hidden
        focusable="false"
      >
        {/* The thread, still dashed: nothing has happened yet. */}
        <line
          x1="26"
          y1="18"
          x2="26"
          y2="98"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          strokeLinecap="round"
        />
        {[18, 56, 94].map((y, index) => (
          <g key={y} opacity={1 - index * 0.28}>
            <circle
              cx="26"
              cy={y}
              r="9"
              className="fill-card"
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
            <rect
              x="44"
              y={y - 8}
              width={index === 1 ? 74 : 92}
              height="7"
              rx="3.5"
              fill="currentColor"
              fillOpacity="0.16"
            />
            <rect
              x="44"
              y={y + 3}
              width={index === 1 ? 46 : 58}
              height="5"
              rx="2.5"
              fill="currentColor"
              fillOpacity="0.1"
            />
          </g>
        ))}
        {/* The next event, in the brand colour: the only accent. */}
        <circle cx="26" cy="18" r="3" className="fill-primary" />
      </svg>
      <p className="mt-4 text-sm font-medium">Rien à signaler pour l’instant</p>
      <p className="mt-1 max-w-[16rem] text-xs leading-5 text-balance text-muted-foreground">
        Chaque consultation et modification de variable apparaîtra ici, au fil de l’eau.
      </p>
    </div>
  );
}
