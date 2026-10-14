import { forgotPasswordSchema } from "@cachkey/shared";
import { revalidateLogic } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { useState } from "react";
import { AuthFooterLink, AuthHeader } from "@/components/auth/auth-shell";
import { useAppForm } from "@/components/form/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { textLinkVariants } from "@/components/ui/text-link";

export const Route = createFileRoute("/_guest/forgot-password")({
  head: () => ({ meta: [{ title: "Mot de passe oublié · Cachkey" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: { email: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: forgotPasswordSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const email = value.email.trim();
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      // The API answers identically whether or not the account exists; only
      // transport-level failures (network, rate limit) are surfaced here.
      if (error) {
        setFormError(getAuthErrorMessage(error));
        return;
      }
      await navigate({ to: "/check-email", search: { email, reason: "reset" } });
    },
  });

  return (
    <>
      <AuthHeader
        title="Mot de passe oublié"
        description="Indiquez l’adresse email de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe."
      />

      {formError ? (
        <Alert variant="destructive" className="mb-6">
          <Icon icon={AlertCircleIcon} />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <form.AppForm>
        <form.Form className="grid gap-5">
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label="Adresse email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                autoFocus
              />
            )}
          </form.AppField>
          <form.SubmitButton className="mt-1">Envoyer le lien</form.SubmitButton>
        </form.Form>
      </form.AppForm>

      <AuthFooterLink>
        <Link to="/sign-in" className={textLinkVariants()}>
          Retour à la connexion
        </Link>
      </AuthFooterLink>
    </>
  );
}
