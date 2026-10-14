import { changeEmailSchema, DELETE_ACCOUNT_PHRASE, profileSchema } from "@cachkey/shared";
import { revalidateLogic } from "@tanstack/react-form";
import { useState } from "react";
import { type z } from "zod";
import { ConfirmByTypingDialog, DangerAction, dangerTriggerClass } from "@/components/app/confirm";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
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
    onSubmit: async ({ value, formApi }) => {
      setFeedback(null);
      const name = value.name.trim();
      const { error } = await authClient.updateUser({ name });
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      formApi.reset({ name });
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
            <form.SubmitButton size="default" className="w-full sm:w-auto" requireChanges>
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

/**
 * Strongest confirmation of the app: open the dialog, read the consequences, type
 * SUPPRIMER, hold the button, then open the link received by email.
 */
export function DeleteAccountCard({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  return (
    <SectionCard title="Zone sensible" className="border-destructive/30">
      {feedback ? <FeedbackAlert feedback={feedback} className="mx-5 mt-5 w-auto sm:mx-6" /> : null}
      <DangerAction
        title="Supprimer mon compte"
        description="Votre profil, vos sessions et vos connexions seront définitivement supprimés."
        action={
          <Button variant="outline" className={dangerTriggerClass} onClick={() => setOpen(true)}>
            Supprimer mon compte
          </Button>
        }
      />
      <ConfirmByTypingDialog
        open={open}
        onOpenChange={setOpen}
        title="Supprimer votre compte ?"
        description="Après cette étape, un lien de confirmation sera envoyé à votre adresse email. Rien n’est supprimé tant que vous ne l’avez pas ouvert."
        consequences={[
          "Votre profil, vos sessions et vos connexions Google ou GitHub seront supprimés.",
          "Vous perdrez l’accès à toutes vos organisations.",
          "Cette action ne pourra pas être annulée.",
        ]}
        expected={DELETE_ACCOUNT_PHRASE}
        confirmLabel="Envoyer le lien de suppression"
        hold
        onConfirm={async () => {
          const { error } = await authClient.deleteUser({ callbackURL: "/sign-in?deleted=1" });
          if (error) return getAuthErrorMessage(error);
          setOpen(false);
          setFeedback({
            tone: "success",
            message: `Dernière étape : ouvrez le lien envoyé à ${user.email}. Votre compte sera supprimé à ce moment-là (le lien expire dans 1 heure).`,
          });
          return null;
        }}
      />
    </SectionCard>
  );
}
