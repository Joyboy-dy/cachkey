import {
  changeEmailSchema,
  DELETE_ACCOUNT_PHRASE,
  deleteAccountSchema,
  profileSchema,
} from "@cachkey/shared";
import { revalidateLogic } from "@tanstack/react-form";
import { useState } from "react";
import { type z } from "zod";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { useAppForm } from "@/components/form/form";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { type AuthSession, useRefreshSession } from "@/lib/auth/session";

type User = AuthSession["user"];

const cardBody = "grid gap-5 px-5 py-5 sm:px-6";
const actions = "flex justify-end border-t px-5 py-3.5 sm:px-6";

export function NameCard({ user }: { user: User }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const refreshSession = useRefreshSession();

  const form = useAppForm({
    defaultValues: { name: user.name },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: profileSchema },
    onSubmit: async ({ value }) => {
      setFeedback(null);
      const { error } = await authClient.updateUser({ name: value.name.trim() });
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      await refreshSession();
      setFeedback({ tone: "success", message: "Votre nom a été mis à jour." });
    },
  });

  return (
    <SectionCard title="Nom" description="Affiché dans l’application et dans les emails envoyés.">
      <form.AppForm>
        <form.Form>
          <div className={cardBody}>
            <FeedbackAlert feedback={feedback} />
            <form.AppField name="name">
              {(field) => <field.TextField label="Nom complet" autoComplete="name" />}
            </form.AppField>
          </div>
          <div className={actions}>
            <form.SubmitButton size="default" className="w-full sm:w-auto">
              Enregistrer
            </form.SubmitButton>
          </div>
        </form.Form>
      </form.AppForm>
    </SectionCard>
  );
}

export function EmailCard({
  user,
  notice,
}: {
  user: User;
  /** Result of a confirmation link, read from the URL by the page. */
  notice: Feedback;
}) {
  const [feedback, setFeedback] = useState<Feedback>(notice);

  const schema = changeEmailSchema.refine(
    (data) => data.newEmail.toLowerCase() !== user.email.toLowerCase(),
    { path: ["newEmail"], message: "C’est déjà votre adresse actuelle." },
  );

  const form = useAppForm({
    defaultValues: { newEmail: "" } satisfies z.input<typeof schema>,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: async ({ value, formApi }) => {
      setFeedback(null);
      const newEmail = value.newEmail.trim();
      const { error } = await authClient.changeEmail({
        newEmail,
        callbackURL: "/account?email=confirmed",
      });
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      formApi.reset();
      // The API answers the same way whether the address is free or not (no enumeration).
      setFeedback({
        tone: "success",
        message: `Si l’adresse ${newEmail} est disponible, un lien de confirmation vient d’être envoyé à ${user.email}. Ouvrez-le, puis validez la nouvelle adresse depuis l’email qu’elle recevra.`,
      });
    },
  });

  return (
    <SectionCard
      title="Adresse email"
      description="Elle sert à vous connecter et à recevoir les alertes de sécurité."
    >
      <form.AppForm>
        <form.Form>
          <div className={cardBody}>
            <FeedbackAlert feedback={feedback} />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Adresse actuelle :</span>
              <span className="font-medium wrap-anywhere">{user.email}</span>
              {user.emailVerified ? (
                <StatusPill tone="success">Confirmée</StatusPill>
              ) : (
                <StatusPill>À confirmer</StatusPill>
              )}
            </div>
            <form.AppField name="newEmail">
              {(field) => (
                <field.TextField
                  label="Nouvelle adresse email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  description="Le changement prend effet une fois les deux adresses confirmées."
                />
              )}
            </form.AppField>
          </div>
          <div className={actions}>
            <form.SubmitButton size="default" className="w-full sm:w-auto">
              Changer d’adresse
            </form.SubmitButton>
          </div>
        </form.Form>
      </form.AppForm>
    </SectionCard>
  );
}

export function DeleteAccountCard({ user }: { user: User }) {
  const [feedback, setFeedback] = useState<Feedback>(null);

  const form = useAppForm({
    defaultValues: { confirmation: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: deleteAccountSchema },
    onSubmit: async ({ formApi }) => {
      setFeedback(null);
      const { error } = await authClient.deleteUser({ callbackURL: "/sign-in?deleted=1" });
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      formApi.reset();
      setFeedback({
        tone: "success",
        message: `Un lien de confirmation a été envoyé à ${user.email}. Votre compte sera supprimé lorsque vous l’ouvrirez (il expire dans 1 heure).`,
      });
    },
  });

  return (
    <SectionCard
      title="Supprimer le compte"
      description="Votre profil, vos sessions et vos connexions seront définitivement supprimés."
      className="border-destructive/30"
    >
      <form.AppForm>
        <form.Form>
          <div className={cardBody}>
            <FeedbackAlert feedback={feedback} />
            <form.AppField name="confirmation">
              {(field) => (
                <field.TextField
                  label={`Saisissez ${DELETE_ACCOUNT_PHRASE} pour confirmer`}
                  autoComplete="off"
                  description="Un email de confirmation vous sera envoyé avant toute suppression."
                />
              )}
            </form.AppField>
          </div>
          <div className={actions}>
            <form.SubmitButton size="default" variant="destructive" className="w-full sm:w-auto">
              Supprimer mon compte
            </form.SubmitButton>
          </div>
        </form.Form>
      </form.AppForm>
    </SectionCard>
  );
}
