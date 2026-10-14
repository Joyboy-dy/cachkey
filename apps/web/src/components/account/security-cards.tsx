import { changePasswordSchema, setPasswordSchema, type SocialProviderId } from "@cachkey/shared";
import { Loading03Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { useAppForm } from "@/components/form/form";
import { GithubIcon, GoogleIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { accountsQueryOptions, setAccountPassword } from "@/lib/auth/account";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { publicConfigQueryOptions } from "@/lib/auth/public-config";
import { formatDate } from "@/lib/date";

const cardBody = "grid gap-5 px-5 py-5 sm:px-6";
const actions = "flex justify-end border-t px-5 py-3.5 sm:px-6";

const PROVIDERS: Record<SocialProviderId, { label: string; icon: ReactNode }> = {
  google: { label: "Google", icon: <GoogleIcon className="size-5" /> },
  github: { label: "GitHub", icon: <GithubIcon className="size-5" /> },
};

function CardSkeleton() {
  return (
    <div className="grid gap-3 px-5 py-5 sm:px-6" aria-hidden>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/** Change the password, or add one when the account was created with Google/GitHub. */
export function PasswordCard() {
  const { data: accounts, isPending } = useQuery(accountsQueryOptions());
  const hasPassword = accounts?.some((account) => account.providerId === "credential");

  if (isPending || !accounts) {
    return (
      <SectionCard title="Mot de passe">
        <CardSkeleton />
      </SectionCard>
    );
  }
  return hasPassword ? <ChangePasswordForm /> : <SetPasswordForm />;
}

function ChangePasswordForm() {
  const [feedback, setFeedback] = useState<Feedback>(null);

  const form = useAppForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: true,
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: changePasswordSchema },
    onSubmit: async ({ value, formApi }) => {
      setFeedback(null);
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: value.revokeOtherSessions,
      });
      if (error) {
        setFeedback({
          tone: "error",
          message:
            error.code === "INVALID_PASSWORD"
              ? "Le mot de passe actuel est incorrect."
              : getAuthErrorMessage(error),
        });
        return;
      }
      formApi.reset();
      setFeedback({
        tone: "success",
        message: value.revokeOtherSessions
          ? "Mot de passe modifié. Vos autres appareils ont été déconnectés."
          : "Mot de passe modifié.",
      });
    },
  });

  return (
    <SectionCard
      title="Mot de passe"
      description="Utilisez un mot de passe long et unique, idéalement généré par un gestionnaire."
    >
      <form.AppForm>
        <form.Form>
          <div className={cardBody}>
            <FeedbackAlert feedback={feedback} />
            <form.AppField name="currentPassword">
              {(field) => (
                <field.PasswordField label="Mot de passe actuel" autoComplete="current-password" />
              )}
            </form.AppField>
            <form.AppField name="newPassword">
              {(field) => (
                <field.PasswordField
                  label="Nouveau mot de passe"
                  autoComplete="new-password"
                  description="Au moins 10 caractères."
                />
              )}
            </form.AppField>
            <form.AppField name="confirmPassword">
              {(field) => (
                <field.PasswordField
                  label="Confirmez le nouveau mot de passe"
                  autoComplete="new-password"
                />
              )}
            </form.AppField>
            <form.AppField name="revokeOtherSessions">
              {(field) => (
                <label className="flex items-start gap-3 text-sm leading-5">
                  <input
                    type="checkbox"
                    name={field.name}
                    checked={field.state.value}
                    onChange={(event) => field.handleChange(event.target.checked)}
                    className="mt-0.5 size-4 accent-foreground"
                  />
                  <span>
                    Déconnecter mes autres appareils
                    <span className="block text-muted-foreground">
                      Recommandé si vous pensez que votre mot de passe a été exposé.
                    </span>
                  </span>
                </label>
              )}
            </form.AppField>
          </div>
          <div className={actions}>
            <form.SubmitButton size="default" className="w-full sm:w-auto">
              Modifier le mot de passe
            </form.SubmitButton>
          </div>
        </form.Form>
      </form.AppForm>
    </SectionCard>
  );
}

function SetPasswordForm() {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const queryClient = useQueryClient();

  const form = useAppForm({
    defaultValues: { newPassword: "", confirmPassword: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: setPasswordSchema },
    onSubmit: async ({ value }) => {
      setFeedback(null);
      const { error } = await setAccountPassword(value.newPassword, value.confirmPassword);
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      // Switches this card to the « change password » form.
      await queryClient.invalidateQueries({ queryKey: accountsQueryOptions().queryKey });
    },
  });

  return (
    <SectionCard
      title="Mot de passe"
      description="Vous vous connectez avec un fournisseur externe. Ajoutez un mot de passe pour pouvoir aussi vous connecter avec votre email."
    >
      <form.AppForm>
        <form.Form>
          <div className={cardBody}>
            <FeedbackAlert feedback={feedback} />
            <form.AppField name="newPassword">
              {(field) => (
                <field.PasswordField
                  label="Mot de passe"
                  autoComplete="new-password"
                  description="Au moins 10 caractères."
                />
              )}
            </form.AppField>
            <form.AppField name="confirmPassword">
              {(field) => (
                <field.PasswordField
                  label="Confirmez le mot de passe"
                  autoComplete="new-password"
                />
              )}
            </form.AppField>
          </div>
          <div className={actions}>
            <form.SubmitButton size="default" className="w-full sm:w-auto">
              Ajouter un mot de passe
            </form.SubmitButton>
          </div>
        </form.Form>
      </form.AppForm>
    </SectionCard>
  );
}

/** Sign-in methods: email + password and the OAuth providers enabled on the instance. */
export function LinkedAccountsCard({ notice }: { notice: Feedback }) {
  const queryClient = useQueryClient();
  const { data: accounts, isPending } = useQuery(accountsQueryOptions());
  const { data: config } = useQuery(publicConfigQueryOptions());
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(notice);

  const providers = config?.socialProviders ?? [];
  const credential = accounts?.find((account) => account.providerId === "credential");
  const methodCount = accounts?.length ?? 0;

  async function link(provider: SocialProviderId) {
    setPending(provider);
    setFeedback(null);
    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: "/account/security?linked=1",
      errorCallbackURL: "/account/security",
    });
    // Success redirects to the provider; we only get here on failure.
    if (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      setPending(null);
    }
  }

  async function unlink(provider: SocialProviderId, accountId: string) {
    setPending(provider);
    setFeedback(null);
    const { error } = await authClient.unlinkAccount({ accountId });
    if (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
    } else {
      await queryClient.invalidateQueries({ queryKey: accountsQueryOptions().queryKey });
      setFeedback({
        tone: "success",
        message: `Votre compte ${PROVIDERS[provider].label} n’est plus relié.`,
      });
    }
    setPending(null);
  }

  return (
    <SectionCard
      title="Méthodes de connexion"
      description="Reliez plusieurs méthodes pour ne jamais perdre l’accès à votre compte."
    >
      {isPending || !accounts ? (
        <CardSkeleton />
      ) : (
        <>
          {feedback ? (
            <FeedbackAlert feedback={feedback} className="mx-5 mt-5 w-auto sm:mx-6" />
          ) : null}
          <ul className="divide-y">
            <MethodRow
              icon={<Icon icon={Mail01Icon} className="size-5" />}
              label="Email et mot de passe"
              detail={
                credential ? `Ajouté le ${formatDate(credential.createdAt)}` : "Non configuré"
              }
              status={credential ? <StatusPill tone="success">Actif</StatusPill> : null}
            />
            {providers.map((provider) => {
              const account = accounts.find((item) => item.providerId === provider);
              const busy = pending === provider;
              return (
                <MethodRow
                  key={provider}
                  icon={PROVIDERS[provider].icon}
                  label={PROVIDERS[provider].label}
                  detail={account ? `Relié le ${formatDate(account.createdAt)}` : "Non relié"}
                  status={
                    account ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unlink(provider, account.id)}
                        disabled={pending !== null || methodCount <= 1}
                        title={
                          methodCount <= 1
                            ? "Ajoutez une autre méthode avant de retirer celle-ci."
                            : undefined
                        }
                      >
                        {busy ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
                        Dissocier
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => link(provider)}
                        disabled={pending !== null}
                      >
                        {busy ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
                        Relier
                      </Button>
                    )
                  }
                />
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

function MethodRow({
  icon,
  label,
  detail,
  status,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  status: ReactNode;
}) {
  return (
    <li className="flex items-center gap-4 px-5 py-4 sm:px-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5 font-medium">{label}</p>
        <p className="text-sm leading-5 text-muted-foreground">{detail}</p>
      </div>
      {status}
    </li>
  );
}
