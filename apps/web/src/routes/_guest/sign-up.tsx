import { PASSWORD_MIN_LENGTH, signUpSchema } from "@cachkey/shared";
import { revalidateLogic } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { AuthFooterLink, AuthHeader } from "@/components/auth/auth-shell";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { useAppForm } from "@/components/form/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage, getOAuthErrorMessage } from "@/lib/auth/errors";
import { publicConfigQueryOptions } from "@/lib/auth/public-config";
import { DEFAULT_AUTHENTICATED_PATH, safeRedirectPath } from "@/lib/auth/redirect";

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_guest/sign-up")({
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(publicConfigQueryOptions()),
  head: () => ({ meta: [{ title: "Créer un compte · Cachkey" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(
    search.error ? getOAuthErrorMessage(search.error) : null,
  );
  const redirectTo = safeRedirectPath(search.redirect) ?? DEFAULT_AUTHENTICATED_PATH;

  const form = useAppForm({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signUpSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const email = value.email.trim();
      const { error } = await authClient.signUp.email({
        name: value.name.trim(),
        email,
        password: value.password,
        // Landing page of the link sent by email.
        callbackURL: "/verify-email",
      });

      if (error) {
        setFormError(getAuthErrorMessage(error));
        return;
      }

      await navigate({ to: "/check-email", search: { email, reason: "verify" } });
    },
  });

  return (
    <>
      <AuthHeader
        title="Créer un compte"
        description="Quelques secondes suffisent pour commencer."
      />

      {formError ? (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <SocialSignIn callbackPath={redirectTo} errorPath="/sign-up" onError={setFormError} />

      <form.AppForm>
        <form.Form className="grid gap-5">
          <form.AppField name="name">
            {(field) => (
              <field.TextField label="Nom" autoComplete="name" placeholder="Alex Martin" />
            )}
          </form.AppField>
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label="Adresse email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
              />
            )}
          </form.AppField>
          <form.AppField name="password">
            {(field) => (
              <field.PasswordField
                label="Mot de passe"
                autoComplete="new-password"
                description={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}
              />
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {(field) => (
              <field.PasswordField label="Confirmer le mot de passe" autoComplete="new-password" />
            )}
          </form.AppField>
          <form.SubmitButton className="mt-1">Créer mon compte</form.SubmitButton>
        </form.Form>
      </form.AppForm>

      <AuthFooterLink>
        Déjà un compte ?{" "}
        <Link
          to="/sign-in"
          search={search.redirect ? { redirect: search.redirect } : {}}
          className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4"
        >
          Se connecter
        </Link>
      </AuthFooterLink>
    </>
  );
}
