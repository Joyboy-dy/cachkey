import { createFileRoute } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { Logo, LogoSymbol } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/lib/auth/use-sign-out";

/** Temporary authenticated landing page (replaced by the dashboard in a later phase). */
export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({ meta: [{ title: "Bienvenue · Cachkey" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  const { session } = Route.useRouteContext();
  const { signOut, isPending } = useSignOut();
  const { user } = session;
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-5 font-medium">{user.name}</p>
              <p className="text-xs leading-[18px] text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} disabled={isPending}>
              {isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <LogOut aria-hidden />
              )}
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="font-mono text-sm tracking-wide text-muted-foreground">ESPACE PERSONNEL</p>
          <h1 className="mt-4 max-w-2xl text-4xl leading-[44px] font-bold tracking-tight sm:text-5xl sm:leading-[52px]">
            Bienvenue, {firstName}.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-6 text-muted-foreground">
            Votre compte Cachkey est prêt. Vous êtes connecté en tant que{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
          </p>

          <div className="mt-12 max-w-xl rounded-xl border bg-card p-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Prochaine étape
            </p>
            <p className="mt-2 text-base leading-6">
              La gestion des projets, des environnements et des secrets sera disponible dans une
              prochaine version de Cachkey.
            </p>
          </div>
        </div>

        <LogoSymbol className="animate-brand-in pointer-events-none absolute -right-20 -bottom-16 hidden h-80 w-auto md:block" />
      </main>
    </div>
  );
}
