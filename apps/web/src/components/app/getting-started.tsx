import { type Dashboard, canManage, type MemberRole } from "@cachkey/shared";
import { Cancel01Icon, MinusSignIcon, Rocket01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { textLinkVariants } from "@/components/ui/text-link";
import { dashboardQueryOptions } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

/*
 * « Premiers pas »: a floating card in the bottom-right corner of every page of the app,
 * until every step is done. It can be folded (a small pill stays) or hidden for a few days,
 * then comes back. The folded / hidden state is a per-browser convenience (localStorage).
 *
 * Motion: one light spring with a small bounce when the card or the pill appears, a quick
 * fade when it leaves. Reduced motion: fades only.
 */

export type Step = {
  title: string;
  description: string;
  done: boolean;
  action?: { label: string; to: "/projects" | "/organization" | "/account" };
};

const HIDE_FOR_DAYS = 3;
const DAY = 86_400_000;

const ENTER: Transition = { type: "spring", duration: 0.35, bounce: 0.3 };
const LEAVE: Transition = { duration: 0.12, ease: "easeIn" };
const hiddenPose = { opacity: 0, scale: 0.94, y: 6 };

/** The steps, from what the overview already knows (no extra request). */
export function buildSteps(
  user: { emailVerified: boolean },
  role: MemberRole,
  data: Dashboard,
): Step[] {
  const email: Step = {
    title: "Confirmer votre adresse email",
    description: "Elle sert à sécuriser votre compte et à le récupérer.",
    done: user.emailVerified,
    action: { label: "Voir mon profil", to: "/account" },
  };
  if (!canManage(role)) {
    return [
      email,
      {
        title: "Accéder à un projet",
        description: "Un administrateur vous partage les projets dont vous avez besoin.",
        done: data.projects.length > 0,
      },
    ];
  }
  const variables = data.projects.reduce((sum, project) => sum + project.variables, 0);
  return [
    email,
    {
      title: "Créer votre premier projet",
      description: "Un projet regroupe les variables d’une application.",
      done: data.projects.length > 0,
      action: { label: "Créer un projet", to: "/projects" },
    },
    {
      title: "Ajouter vos variables",
      description: "Importez votre fichier .env : chaque valeur est chiffrée.",
      done: variables > 0,
      action: { label: "Ouvrir mes projets", to: "/projects" },
    },
    {
      title: "Inviter votre équipe",
      description: "Partagez l’accès sans jamais envoyer un secret par message.",
      done: (data.setup?.members ?? 1) > 1 || (data.setup?.pendingInvitations ?? 0) > 0,
      action: { label: "Inviter", to: "/organization" },
    },
  ];
}

/**
 * Mounted once in the application shell. Data comes from the overview query (shared cache
 * with the dashboard) and is refreshed on navigation while steps remain, so a step done on
 * another page is ticked when the user moves on.
 */
export function GettingStartedDock({
  user,
  organization,
}: {
  user: { id: string; emailVerified: boolean };
  organization: { id: string; role: MemberRole };
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { data, refetch } = useQuery(dashboardQueryOptions(organization.id));
  const steps = data ? buildSteps(user, organization.role, data) : [];
  const pending = steps.some((step) => !step.done);

  useEffect(() => {
    if (pending) void refetch();
  }, [pathname, pending, refetch]);

  if (!data || !pending) return null;
  // On the overview, stay clear of the activity panel (xl+) or of its handle (smaller).
  const besideActivity = pathname === "/dashboard" && data.activity !== null;
  return (
    <GettingStarted
      scope={`${user.id}:${organization.id}`}
      steps={steps}
      className={besideActivity ? "max-xl:bottom-[4.75rem] xl:right-[22rem]" : undefined}
    />
  );
}

function storageKey(scope: string) {
  return `cachkey:getting-started:${scope}`;
}

type Stored = { hiddenUntil?: number; folded?: boolean; hidden?: boolean };

const noopSubscribe = () => () => {};

function read(scope: string): Stored {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    // First visit on a phone: start folded, the open card would cover the page.
    const stored = raw
      ? (JSON.parse(raw) as Stored)
      : { folded: window.matchMedia("(max-width: 639px)").matches };
    return { ...stored, hidden: (stored.hiddenUntil ?? 0) > Date.now() };
  } catch {
    return { folded: true };
  }
}

function write(scope: string, value: Stored) {
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: the widget simply shows again next time.
  }
}

function GettingStarted({
  scope,
  steps,
  className,
}: {
  scope: string;
  steps: Step[];
  className?: string;
}) {
  const titleId = useId();
  // Hidden until hydrated: the server cannot know the stored state (no flash, no mismatch).
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [changed, setState] = useState<Stored | null>(null);
  const state = changed ?? (hydrated ? read(scope) : null);

  const doneCount = steps.filter((step) => step.done).length;
  const nextIndex = steps.findIndex((step) => !step.done);
  const mode =
    !state || nextIndex === -1 || state.hidden ? "hidden" : state.folded ? "folded" : "open";

  function update(next: Stored) {
    setState(next);
    write(scope, next);
  }

  const progress = (
    <span className="font-mono text-xs text-muted-foreground tabular-nums">
      {doneCount}/{steps.length}
    </span>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-end sm:inset-x-auto sm:right-4",
          className,
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          {mode === "folded" ? (
            <motion.div
              key="pill"
              className="pointer-events-auto origin-bottom-right"
              initial={hiddenPose}
              animate={{ opacity: 1, scale: 1, y: 0, transition: ENTER }}
              exit={{ ...hiddenPose, transition: LEAVE }}
            >
              <Button
                variant="outline"
                className="h-10 rounded-full bg-card px-4 shadow-lg"
                onClick={() => update({ folded: false })}
                aria-label={`Premiers pas, ${doneCount} sur ${steps.length} terminés. Afficher`}
                aria-expanded={false}
              >
                <Icon icon={Rocket01Icon} className="text-primary" />
                Premiers pas
                {progress}
              </Button>
            </motion.div>
          ) : null}

          {mode === "open" ? (
            <motion.section
              key="card"
              aria-labelledby={titleId}
              className="pointer-events-auto w-full origin-bottom-right overflow-hidden rounded-xl border bg-card shadow-xl sm:w-[22rem]"
              initial={hiddenPose}
              animate={{ opacity: 1, scale: 1, y: 0, transition: ENTER }}
              exit={{ ...hiddenPose, transition: LEAVE }}
            >
              <header className="flex items-start gap-1 py-3 pr-2 pl-4">
                <div className="min-w-0 flex-1 pt-1">
                  <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold">
                    Premiers pas {progress}
                  </h2>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Quelques étapes pour bien démarrer.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={() => update({ folded: true })}
                  aria-label="Réduire"
                  aria-expanded
                  title="Réduire"
                >
                  <Icon icon={MinusSignIcon} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={() =>
                    update({ hiddenUntil: Date.now() + HIDE_FOR_DAYS * DAY, hidden: true })
                  }
                  aria-label={`Masquer pendant ${HIDE_FOR_DAYS} jours`}
                  title={`Masquer pendant ${HIDE_FOR_DAYS} jours`}
                >
                  <Icon icon={Cancel01Icon} />
                </Button>
              </header>
              <div
                className="h-1 bg-secondary"
                role="progressbar"
                aria-label="Progression des premiers pas"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={doneCount}
              >
                <div
                  className="h-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${(doneCount / steps.length) * 100}%` }}
                />
              </div>
              <ol className="max-h-[50vh] divide-y overflow-y-auto overscroll-contain">
                {steps.map((step, index) => (
                  <StepItem key={step.title} step={step} index={index} next={index === nextIndex} />
                ))}
              </ol>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function StepItem({ step, index, next }: { step: Step; index: number; next: boolean }) {
  return (
    <li className={cn("flex gap-3 px-4 py-3", next && "bg-accent/40")}>
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
          step.done && "border-foreground bg-foreground text-background",
          !step.done && next && "border-primary text-foreground",
          !step.done && !next && "border-border text-muted-foreground",
        )}
        aria-hidden
      >
        {step.done ? <Icon icon={Tick02Icon} className="size-3" strokeWidth={3} /> : index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-5 font-medium",
            step.done && "text-foreground/75 line-through decoration-foreground/50",
          )}
        >
          {step.title}
          <span className="sr-only">{step.done ? " (terminé)" : " (à faire)"}</span>
        </p>
        {next ? (
          <>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.description}</p>
            {step.action ? (
              <Link to={step.action.to} className={cn(textLinkVariants(), "mt-1 text-xs")}>
                {step.action.label}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </li>
  );
}
