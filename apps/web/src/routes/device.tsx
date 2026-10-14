import { Loading03Icon } from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { AuthHeader, AuthShell } from "@/components/auth/auth-shell";
import { useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { textLinkVariants } from "@/components/ui/text-link";
import { authClient } from "@/lib/auth/auth-client";
import { sessionQueryOptions } from "@/lib/auth/session";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { cn } from "@/lib/utils";

/*
 * Approval page of `cachkey login` (device authorization). The terminal shows a short code
 * and opens this page; the signed-in user checks that the codes match, then allows or
 * refuses. Allowing gives the terminal a session with the same rights as the user.
 */

/** « wdjb-mjht », « WDJB MJHT » → « WDJBMJHT », as stored by Better Auth. */
function normalizeCode(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

/** « WDJBMJHT » → « WDJB-MJHT », as the terminal shows it. */
function formatCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

const codeSchema = z.object({
  code: z
    .string()
    .transform(normalizeCode)
    .pipe(z.string().regex(/^[A-Z0-9]{8}$/, "Le code contient 8 lettres ou chiffres.")),
});

export const Route = createFileRoute("/device")({
  validateSearch: z.object({ user_code: z.string().max(32).optional().catch(undefined) }),
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions());
    if (!session) throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    return { session };
  },
  head: () => ({ meta: [{ title: "Connecter un terminal · Cachkey" }] }),
  component: DevicePage,
});

type Step =
  | { name: "enter" }
  | { name: "checking"; code: string }
  | { name: "confirm"; code: string }
  | { name: "done"; approved: boolean }
  | { name: "invalid" };

function DevicePage() {
  const { user_code: fromUrl } = Route.useSearch();
  const { session } = Route.useRouteContext();
  const navigate = useNavigate({ from: Route.fullPath });
  const { signOut, isPending: signingOut } = useSignOut();
  const [step, setStep] = useState<Step>(() =>
    fromUrl ? { name: "checking", code: normalizeCode(fromUrl) } : { name: "enter" },
  );
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Claims the code for this account: required before allowing or refusing it.
  useEffect(() => {
    if (step.name !== "checking") return;
    let active = true;
    void authClient.device({ query: { user_code: step.code } }).then(({ data, error }) => {
      if (!active) return;
      setStep(
        error || data.status !== "pending"
          ? { name: "invalid" }
          : { name: "confirm", code: step.code },
      );
    });
    return () => {
      active = false;
    };
  }, [step]);

  async function decide(approve: boolean) {
    if (step.name !== "confirm") return;
    setPending(approve ? "approve" : "deny");
    setFeedback(null);
    const { error } = approve
      ? await authClient.device.approve({ userCode: step.code })
      : await authClient.device.deny({ userCode: step.code });
    setPending(null);
    if (error) {
      setFeedback({
        tone: "error",
        message: "Ce code a expiré ou a déjà été utilisé. Relancez « cachkey login ».",
      });
      return;
    }
    setStep({ name: "done", approved: approve });
    // The code must not stay in the address bar once used.
    void navigate({ search: {}, replace: true });
  }

  const signedInAs = (
    <p className="mt-7 border-t pt-6 text-center text-sm text-muted-foreground">
      Connecté en tant que <span className="font-medium text-foreground">{session.user.email}</span>
      .{" "}
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-foreground"
      >
        Changer de compte
      </button>
    </p>
  );

  if (step.name === "done") {
    return (
      <AuthShell>
        <AuthHeader
          tone={step.approved ? "success" : "error"}
          title={step.approved ? "Terminal connecté" : "Connexion refusée"}
          description={
            step.approved
              ? "Vous pouvez fermer cette page et retourner dans votre terminal. Vous pourrez déconnecter ce terminal à tout moment depuis Mon compte, Appareils."
              : "Le terminal n’a reçu aucun accès. Si vous n’êtes pas à l’origine de cette demande, aucune action n’est nécessaire."
          }
        />
        <Link to="/dashboard" className={cn(textLinkVariants(), "text-sm")}>
          Aller à mon espace
        </Link>
        {signedInAs}
      </AuthShell>
    );
  }

  if (step.name === "invalid") {
    return (
      <AuthShell>
        <AuthHeader
          tone="error"
          title="Code invalide ou expiré"
          description="Les codes sont valables 10 minutes et ne servent qu’une fois. Relancez « cachkey login » dans votre terminal pour en obtenir un nouveau."
        />
        <Button variant="outline" size="lg" onClick={() => setStep({ name: "enter" })}>
          Saisir un autre code
        </Button>
        {signedInAs}
      </AuthShell>
    );
  }

  if (step.name === "enter") {
    return (
      <AuthShell>
        <AuthHeader
          title="Connecter un terminal"
          description="Saisissez le code affiché par « cachkey login » dans votre terminal."
        />
        <CodeForm onSubmit={(code) => setStep({ name: "checking", code })} />
        {signedInAs}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeader
        title="Autoriser ce terminal ?"
        description="L’outil en ligne de commande Cachkey demande à accéder à votre compte."
      />
      {step.name === "checking" ? (
        <div className="flex justify-center py-8" aria-live="polite">
          <Icon icon={Loading03Icon} className="size-5 animate-spin text-muted-foreground" />
          <span className="sr-only">Vérification du code…</span>
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-xl border bg-card px-4 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              Vérifiez que ce code est celui affiché dans votre terminal
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em]">
              {formatCode(step.code)}
            </p>
          </div>
          <ul className="mb-5 grid gap-1.5 text-sm leading-5 text-muted-foreground">
            <li>• Il aura les mêmes droits que vous, dans toutes vos organisations.</li>
            <li>• Il pourra lire et, selon vos accès, modifier les variables.</li>
            <li>• Ses actions apparaîtront dans le journal d’activité.</li>
          </ul>
          <p className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm leading-5">
            Vous n’avez pas lancé « cachkey login » vous-même à l’instant ? Refusez : quelqu’un
            essaie d’accéder à votre compte.
          </p>
          <FeedbackAlert feedback={feedback} className="mb-5" />
          <div className="grid gap-3">
            <Button size="lg" onClick={() => void decide(true)} disabled={pending !== null}>
              {pending === "approve" ? (
                <Icon icon={Loading03Icon} className="animate-spin" />
              ) : null}
              Autoriser
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => void decide(false)}
              disabled={pending !== null}
            >
              {pending === "deny" ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
              Refuser
            </Button>
          </div>
        </>
      )}
      {signedInAs}
    </AuthShell>
  );
}

function CodeForm({ onSubmit }: { onSubmit: (code: string) => void }) {
  const form = useAppForm({
    defaultValues: { code: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: codeSchema },
    onSubmit: ({ value }) => onSubmit(normalizeCode(value.code)),
  });

  return (
    <form.AppForm>
      <form.Form className="grid gap-5">
        <form.AppField name="code">
          {(field) => (
            <field.TextField label="Code" placeholder="WDJB-MJHT" autoComplete="off" autoFocus />
          )}
        </form.AppField>
        <form.SubmitButton>Continuer</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
