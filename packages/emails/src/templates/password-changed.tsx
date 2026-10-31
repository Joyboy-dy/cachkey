import { EmailLayout } from "../components/email-layout";
import { EmailButton, EmailHeading, EmailMuted, EmailText } from "../components/primitives";

export type PasswordChangedProps = {
  appUrl: string;
  name: string;
  /** `reset`: forgotten-password flow · `changed`: from account settings · `set`: first password. */
  reason?: "reset" | "changed" | "set";
};

const BODY: Record<NonNullable<PasswordChangedProps["reason"]>, string> = {
  reset:
    "Le mot de passe de votre compte Cachkey vient d’être réinitialisé. Par sécurité, toutes vos sessions actives ont été fermées.",
  changed: "Le mot de passe de votre compte Cachkey vient d’être modifié depuis vos paramètres.",
  set: "Un mot de passe vient d’être ajouté à votre compte Cachkey. Vous pouvez désormais vous connecter avec votre adresse email.",
};

export default function PasswordChanged({ appUrl, name, reason = "reset" }: PasswordChangedProps) {
  return (
    <EmailLayout appUrl={appUrl}>
      <EmailHeading>
        {reason === "set" ? "Mot de passe ajouté" : "Mot de passe modifié"}
      </EmailHeading>
      <EmailText>Bonjour {name},</EmailText>
      <EmailText>{BODY[reason]}</EmailText>
      <EmailButton href={`${appUrl}/sign-in`}>Se connecter</EmailButton>
      <EmailMuted>
        Si vous n’êtes pas à l’origine de ce changement, réinitialisez immédiatement votre mot de
        passe et contactez l’administrateur de votre instance.
      </EmailMuted>
    </EmailLayout>
  );
}

PasswordChanged.PreviewProps = {
  appUrl: "http://localhost:3000",
  name: "Alex",
  reason: "changed",
} satisfies PasswordChangedProps;
