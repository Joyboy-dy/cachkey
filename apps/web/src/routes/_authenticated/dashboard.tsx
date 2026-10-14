import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight02Icon, MailValidation01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { PageContainer, PageHeader, SectionCard, StatusPill } from "@/components/app/page";
import { UserAvatar } from "@/components/app/user-avatar";
import { textLinkVariants } from "@/components/ui/text-link";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Vue d’ensemble · Cachkey" }] }),
  component: DashboardPage,
});

type Step = { title: string; description: string; done: boolean };

function DashboardPage() {
  const { session } = Route.useRouteContext();
  const { user } = session;
  const firstName = user.name.split(" ")[0] || user.name;

  const steps: Step[] = [
    {
      title: "Créer votre compte",
      description: "Votre espace Cachkey est prêt.",
      done: true,
    },
    {
      title: "Confirmer votre adresse email",
      description: "Elle sert à sécuriser votre compte et à le récupérer.",
      done: user.emailVerified,
    },
    {
      title: "Créer votre premier projet",
      description: "Un projet regroupe les secrets d’une application.",
      done: false,
    },
    {
      title: "Ajouter vos environnements et vos secrets",
      description: "Développement, production… chacun avec ses propres valeurs.",
      done: false,
    },
    {
      title: "Inviter votre équipe",
      description: "Partagez l’accès sans jamais envoyer un secret par message.",
      done: false,
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const nextIndex = steps.findIndex((step) => !step.done);

  return (
    <PageContainer>
      <PageHeader
        title={`Bonjour, ${firstName}`}
        description="Retrouvez ici l’essentiel de votre espace Cachkey."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Premiers pas"
          description="Quelques étapes pour mettre vos secrets à l’abri."
          aside={
            <span className="font-mono text-sm whitespace-nowrap text-muted-foreground">
              {doneCount}/{steps.length}
            </span>
          }
        >
          <div
            className="h-1 bg-secondary"
            role="progressbar"
            aria-label="Progression des premiers pas"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={doneCount}
          >
            <div
              className="h-full bg-primary transition-[width] duration-500"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
          <ol className="divide-y">
            {steps.map((step, index) => (
              <li key={step.title} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                    step.done && "border-foreground bg-foreground text-background",
                    !step.done && index === nextIndex && "border-primary text-foreground",
                    !step.done && index !== nextIndex && "border-border text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {step.done ? (
                    <Icon icon={Tick02Icon} className="size-3.5" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm leading-6 font-medium",
                      step.done && "text-muted-foreground line-through decoration-border",
                    )}
                  >
                    {step.title}
                    <span className="sr-only">{step.done ? " (terminé)" : " (à faire)"}</span>
                  </p>
                  <p className="text-sm leading-5 text-muted-foreground">{step.description}</p>
                </div>
                {!step.done && index > 1 ? <StatusPill>Bientôt</StatusPill> : null}
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard title="Votre compte" className="self-start">
          <div className="flex items-center gap-3 px-5 py-5 sm:px-6">
            <UserAvatar user={user} className="size-11 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm leading-6 font-medium">{user.name}</p>
              <p className="truncate text-sm leading-5 text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t px-5 py-3.5 text-sm sm:px-6">
            <Icon
              icon={MailValidation01Icon}
              className={cn(
                "size-4",
                user.emailVerified ? "text-success" : "text-muted-foreground",
              )}
              aria-hidden
            />
            {user.emailVerified ? "Adresse email confirmée" : "Adresse email à confirmer"}
          </div>
          <div className="border-t px-5 py-3.5 sm:px-6">
            <Link
              to="/account"
              className={cn(textLinkVariants(), "inline-flex items-center gap-1.5 text-sm")}
            >
              Gérer mon compte
              <Icon icon={ArrowRight02Icon} className="size-4" aria-hidden />
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
