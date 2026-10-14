import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { z } from "zod";
import { AuthFooterLink, AuthHeader } from "@/components/auth/auth-shell";
import { ResendVerificationButton } from "@/components/auth/resend-verification";
import { Button } from "@/components/ui/button";
import { textLinkVariants } from "@/components/ui/text-link";

const searchSchema = z.object({
  email: z.string().optional().catch(undefined),
  reason: z.enum(["verify", "reset"]).catch("verify"),
});

/** Confirmation screen shown after any action that sends an email. */
export const Route = createFileRoute("/_guest/check-email")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Vérifiez vos emails · Cachkey" }] }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email, reason } = Route.useSearch();
  const recipient = email ? (
    <span className="font-medium wrap-anywhere text-foreground">{email}</span>
  ) : (
    "votre adresse"
  );

  if (reason === "reset") {
    return (
      <>
        <AuthHeader
          icon={<MailCheck />}
          title="Vérifiez vos emails"
          description={
            <>
              Si un compte existe pour {recipient}, vous allez recevoir un lien pour réinitialiser
              votre mot de passe. Il expire dans 1 heure.
            </>
          }
        />
        <p className="mb-6 text-sm text-muted-foreground">
          Rien reçu après quelques minutes ? Vérifiez vos courriers indésirables, puis refaites une
          demande.
        </p>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link to="/forgot-password">Refaire une demande</Link>
        </Button>
        <AuthFooterLink>
          <Link to="/sign-in" className={textLinkVariants()}>
            Retour à la connexion
          </Link>
        </AuthFooterLink>
      </>
    );
  }

  return (
    <>
      <AuthHeader
        icon={<MailCheck />}
        title="Confirmez votre adresse"
        description={
          <>
            Nous avons envoyé un lien de confirmation à {recipient}. Ouvrez-le pour activer votre
            compte ; il expire dans 1 heure.
          </>
        }
      />
      <p className="mb-6 text-sm text-muted-foreground">
        Rien reçu ? Vérifiez vos courriers indésirables ou demandez un nouvel envoi.
      </p>
      {email ? <ResendVerificationButton email={email} initialCooldown={30} /> : null}
      <AuthFooterLink>
        <Link to="/sign-in" className={textLinkVariants()}>
          Retour à la connexion
        </Link>
      </AuthFooterLink>
    </>
  );
}
