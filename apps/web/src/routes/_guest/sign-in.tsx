import { signInSchema } from "@cachkey/shared";
import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { AlertCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
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
import { sessionQueryKey } from "@/lib/auth/session";
import { textLinkVariants } from "@/components/ui/text-link";

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  /** OAuth failure code appended by Better Auth. */
  error: z.string().optional().catch(undefined),
  /** Set after a successful password reset. */
  reset: z.literal("success").optional().catch(undefined),
  /** Set after the account deletion link was followed. */
  deleted: z.literal("1").optional().catch(undefined),
});

export const Route = createFileRoute("/_guest/sign-in")({
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(publicConfigQueryOptions()),
  head: () => ({ meta: [{ title: "Connexion · Cachkey" }] }),
  component: SignInPage,
});

function SignInPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(
    search.error ? getOAuthErrorMessage(search.error) : null,
  );
  const redirectTo = safeRedirectPath(search.redirect) ?? DEFAULT_AUTHENTICATED_PATH;

  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signInSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.signIn.email({
        email: value.email.trim(),
        password: value.password,
      });

      if (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          // Better Auth has just re-sent the verification link (sendOnSignIn).
          await navigate({
            to: "/check-email",
            search: { email: value.email.trim(), reason: "verify" },
          });
          return;
        }
        setFormError(getAuthErrorMessage(error));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await router.invalidate();
      await navigate({ href: redirectTo, replace: true });
    },
  });

  return (
    <>
      <AuthHeader title="Connexion" description="Accédez à votre espace Cachkey." />

      {search.reset === "success" && !formError ? (
        <Alert variant="success" className="mb-6">
          <Icon icon={CheckmarkCircle02Icon} />
          <AlertDescription>
            Votre mot de passe a été modifié. Connectez-vous avec le nouveau.
          </AlertDescription>
        </Alert>
      ) : null}

      {search.deleted && !formError ? (
        <Alert variant="success" className="mb-6">
          <Icon icon={CheckmarkCircle02Icon} />
          <AlertDescription>
            Votre compte a été supprimé. Merci d’avoir utilisé Cachkey.
          </AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="destructive" className="mb-6">
          <Icon icon={AlertCircleIcon} />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <SocialSignIn callbackPath={redirectTo} errorPath="/sign-in" onError={setFormError} />

      <form.AppForm>
        <form.Form className="grid gap-5">
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
                autoComplete="current-password"
                labelAside={
                  <Link to="/forgot-password" className={textLinkVariants({ variant: "subtle" })}>
                    Mot de passe oublié ?
                  </Link>
                }
              />
            )}
          </form.AppField>
          <form.SubmitButton className="mt-1">Se connecter</form.SubmitButton>
        </form.Form>
      </form.AppForm>

      <AuthFooterLink>
        Pas encore de compte ?{" "}
        <Link
          to="/sign-up"
          search={search.redirect ? { redirect: search.redirect } : {}}
          className={textLinkVariants()}
        >
          Créer un compte
        </Link>
      </AuthFooterLink>
    </>
  );
}
