import { PASSWORD_MIN_LENGTH, resetPasswordSchema } from "@cachkey/shared";
import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { useState } from "react";
import { z } from "zod";
import { AuthFooterLink, AuthHeader, AuthShell } from "@/components/auth/auth-shell";
import { useAppForm } from "@/components/form/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { sessionQueryKey } from "@/lib/auth/session";
import { textLinkVariants } from "@/components/ui/text-link";

const searchSchema = z.object({
  token: z.string().optional().catch(undefined),
  /** `INVALID_TOKEN` when Better Auth rejects the link. */
  error: z.string().optional().catch(undefined),
});

/**
 * Target of the reset link. Better Auth validates the token at /api/auth/reset-password/:token
 * and redirects here with `?token=` (valid) or `?error=` (invalid / expired).
 * Accessible with or without a session.
 */
export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Nouveau mot de passe · Cachkey" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error } = Route.useSearch();

  return (
    <AuthShell>{token && !error ? <ResetPasswordForm token={token} /> : <InvalidLink />}</AuthShell>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenRejected, setTokenRejected] = useState(false);

  const form = useAppForm({
    defaultValues: { password: "", confirmPassword: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: resetPasswordSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.resetPassword({ newPassword: value.password, token });
      if (error) {
        if (error.code === "INVALID_TOKEN") {
          setTokenRejected(true);
          return;
        }
        setFormError(getAuthErrorMessage(error));
        return;
      }
      // All sessions are revoked on reset: forget any cached session.
      queryClient.removeQueries({ queryKey: sessionQueryKey });
      await navigate({ to: "/sign-in", search: { reset: "success" }, replace: true });
    },
  });

  if (tokenRejected) return <InvalidLink />;

  return (
    <>
      <AuthHeader
        title="Nouveau mot de passe"
        description="Choisissez un mot de passe que vous n’utilisez nulle part ailleurs. Vos sessions ouvertes seront fermées."
      />

      {formError ? (
        <Alert variant="destructive" className="mb-6">
          <Icon icon={AlertCircleIcon} />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <form.AppForm>
        <form.Form className="grid gap-5">
          <form.AppField name="password">
            {(field) => (
              <field.PasswordField
                label="Nouveau mot de passe"
                autoComplete="new-password"
                description={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}
                autoFocus
              />
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {(field) => (
              <field.PasswordField label="Confirmer le mot de passe" autoComplete="new-password" />
            )}
          </form.AppField>
          <form.SubmitButton className="mt-1">Enregistrer le mot de passe</form.SubmitButton>
        </form.Form>
      </form.AppForm>
    </>
  );
}

function InvalidLink() {
  return (
    <>
      <AuthHeader
        tone="error"
        title="Lien invalide ou expiré"
        description="Ce lien de réinitialisation ne peut plus être utilisé. Les liens expirent après 1 heure et ne servent qu’une fois."
      />
      <Button asChild size="lg" className="w-full">
        <Link to="/forgot-password">Demander un nouveau lien</Link>
      </Button>
      <AuthFooterLink>
        <Link to="/sign-in" className={textLinkVariants()}>
          Retour à la connexion
        </Link>
      </AuthFooterLink>
    </>
  );
}
