import { backupCodeSignInSchema, twoFactorSignInSchema } from "@cachkey/shared";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthFooterLink, AuthHeader } from "@/components/auth/auth-shell";
import { useAppForm } from "@/components/form/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { textLinkVariants } from "@/components/ui/text-link";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { DEFAULT_AUTHENTICATED_PATH, safeRedirectPath } from "@/lib/auth/redirect";
import { sessionQueryKey } from "@/lib/auth/session";

/*
 * Second step of an email + password sign-in when the account has two-factor
 * authentication. The password step left a short-lived (10 min) cookie; a code from the
 * authenticator app, or a single-use backup code, turns it into a session.
 */

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_guest/two-factor")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Vérification en deux étapes · Cachkey" }] }),
  component: TwoFactorPage,
});

/** Codes after which the password step must be done again. */
const RESTART_CODES = new Set(["INVALID_TWO_FACTOR_COOKIE", "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE"]);

type VerifyResult = { error: { code?: string; status?: number } | null };

function TwoFactorPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<"app" | "backup">("app");
  const [formError, setFormError] = useState<{ message: string; restart: boolean } | null>(null);
  const redirectTo = safeRedirectPath(search.redirect) ?? DEFAULT_AUTHENTICATED_PATH;

  /** Resolves to false when the code was refused. */
  async function finish({ error }: VerifyResult): Promise<boolean> {
    if (error) {
      setFormError({
        message: getAuthErrorMessage(error),
        restart: Boolean(error.code && RESTART_CODES.has(error.code)),
      });
      return false;
    }
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    await router.invalidate();
    await navigate({ href: redirectTo, replace: true });
    return true;
  }

  function switchTo(next: "app" | "backup") {
    setFormError(null);
    setMethod(next);
  }

  return (
    <>
      <AuthHeader
        title="Vérification en deux étapes"
        description={
          method === "app"
            ? "Saisissez le code à 6 chiffres affiché par votre application d’authentification."
            : "Saisissez l’un de vos codes de secours. Chaque code ne sert qu’une fois."
        }
      />

      {formError ? (
        <Alert variant="destructive" className="mb-6">
          <Icon icon={AlertCircleIcon} />
          <AlertDescription>
            {formError.message}
            {formError.restart ? (
              <>
                {" "}
                <Link
                  to="/sign-in"
                  search={search.redirect ? { redirect: search.redirect } : {}}
                  className={textLinkVariants()}
                >
                  Revenir à la connexion
                </Link>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {method === "app" ? (
        <AppCodeForm
          onSubmit={async (value) => {
            setFormError(null);
            return finish(await authClient.twoFactor.verifyTotp(value));
          }}
        />
      ) : (
        <BackupCodeForm
          onSubmit={async (value) => {
            setFormError(null);
            return finish(await authClient.twoFactor.verifyBackupCode(value));
          }}
        />
      )}

      <AuthFooterLink>
        {method === "app" ? (
          <>
            Plus accès à votre application ?{" "}
            <button type="button" onClick={() => switchTo("backup")} className={textLinkVariants()}>
              Utiliser un code de secours
            </button>
          </>
        ) : (
          <button type="button" onClick={() => switchTo("app")} className={textLinkVariants()}>
            Utiliser l’application d’authentification
          </button>
        )}
      </AuthFooterLink>
    </>
  );
}

type CodeValues = { code: string; trustDevice: boolean };

function AppCodeForm({ onSubmit }: { onSubmit: (value: CodeValues) => Promise<boolean> }) {
  const form = useAppForm({
    defaultValues: { code: "", trustDevice: false },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: twoFactorSignInSchema },
    onSubmit: async ({ value, formApi }) => {
      if (await onSubmit(twoFactorSignInSchema.parse(value))) return;
      // Refused code: empty slots and no field error (the alert says why), focus kept,
      // « trust this device » choice kept.
      formApi.reset();
      formApi.setFieldValue("trustDevice", value.trustDevice);
    },
  });

  return (
    <form.AppForm>
      <form.Form className="grid gap-5">
        <form.AppField name="code">
          {(field) => <field.CodeField label="Code de vérification" autoFocus />}
        </form.AppField>
        <form.AppField name="trustDevice">
          {(field) => <field.CheckboxField {...TRUST_DEVICE} />}
        </form.AppField>
        <form.SubmitButton className="mt-1">Vérifier</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}

function BackupCodeForm({ onSubmit }: { onSubmit: (value: CodeValues) => Promise<boolean> }) {
  const form = useAppForm({
    defaultValues: { code: "", trustDevice: false },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: backupCodeSignInSchema },
    onSubmit: async ({ value }) => {
      // A refused backup code stays in the field: it is easier to fix a typo than retype it.
      await onSubmit(backupCodeSignInSchema.parse(value));
    },
  });

  return (
    <form.AppForm>
      <form.Form className="grid gap-5">
        <form.AppField name="code">
          {(field) => (
            <field.TextField
              label="Code de secours"
              placeholder="abcde-12345"
              autoComplete="off"
              autoFocus
            />
          )}
        </form.AppField>
        <form.AppField name="trustDevice">
          {(field) => <field.CheckboxField {...TRUST_DEVICE} />}
        </form.AppField>
        <form.SubmitButton className="mt-1">Vérifier</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}

const TRUST_DEVICE = {
  label: "Faire confiance à cet appareil pendant 30 jours",
  description: "Seulement sur un appareil personnel. Le code ne sera plus demandé ici.",
};
