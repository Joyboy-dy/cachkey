import { resendVerificationSchema } from "@cachkey/shared";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CancelCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { useState } from "react";
import { z } from "zod";
import { AuthFooterLink, AuthHeader, AuthShell } from "@/components/auth/auth-shell";
import { ResendVerificationButton } from "@/components/auth/resend-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_AUTHENTICATED_PATH } from "@/lib/auth/redirect";
import { sessionQueryOptions } from "@/lib/auth/session";
import { textLinkVariants } from "@/components/ui/text-link";

const searchSchema = z.object({
  /** Set by Better Auth when the verification token is invalid or expired. */
  error: z.string().optional().catch(undefined),
});

/**
 * Landing page of the verification link. Better Auth verifies the token, signs the user
 * in (autoSignInAfterVerification), then redirects here — with `?error=` on failure.
 */
export const Route = createFileRoute("/verify-email")({
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => ({
    session: await context.queryClient.fetchQuery(sessionQueryOptions()),
  }),
  head: () => ({ meta: [{ title: "Confirmation de l’adresse · Cachkey" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { error } = Route.useSearch();
  const { session } = Route.useRouteContext();

  return (
    <AuthShell>
      {error ? (
        <VerificationFailed />
      ) : (
        <>
          <AuthHeader
            icon={<Icon icon={CheckmarkCircle02Icon} className="text-success" />}
            title="Adresse confirmée"
            description="Votre adresse email est vérifiée. Votre compte Cachkey est actif."
          />
          <Button asChild size="lg" className="w-full">
            {session ? (
              <Link to={DEFAULT_AUTHENTICATED_PATH}>Continuer</Link>
            ) : (
              <Link to="/sign-in">Se connecter</Link>
            )}
          </Button>
        </>
      )}
    </AuthShell>
  );
}

function VerificationFailed() {
  const [email, setEmail] = useState("");
  const parsed = resendVerificationSchema.safeParse({ email });

  return (
    <>
      <AuthHeader
        icon={<Icon icon={CancelCircleIcon} className="text-destructive" />}
        title="Lien invalide ou expiré"
        description="Ce lien de confirmation ne peut plus être utilisé. Saisissez votre adresse pour en recevoir un nouveau."
      />
      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="resend-email">Adresse email</Label>
          <Input
            id="resend-email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {parsed.success ? (
          <ResendVerificationButton email={parsed.data.email} />
        ) : (
          <Button variant="outline" size="lg" className="w-full" disabled>
            Renvoyer l’email
          </Button>
        )}
      </div>
      <AuthFooterLink>
        <Link to="/sign-in" className={textLinkVariants()}>
          Retour à la connexion
        </Link>
      </AuthFooterLink>
    </>
  );
}
