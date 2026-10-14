import { EmailLayout } from "../components/email-layout";
import { EmailButton, EmailHeading, EmailMuted, EmailText } from "../components/primitives";

export type PasswordChangedProps = {
  appUrl: string;
  name: string;
};

export default function PasswordChanged({ appUrl, name }: PasswordChangedProps) {
  return (
    <EmailLayout preview="Le mot de passe de votre compte Cachkey a été modifié." appUrl={appUrl}>
      <EmailHeading>Mot de passe modifié</EmailHeading>
      <EmailText>Bonjour {name},</EmailText>
      <EmailText>
        Le mot de passe de votre compte Cachkey vient d’être réinitialisé. Par sécurité, toutes vos
        sessions actives ont été fermées.
      </EmailText>
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
} satisfies PasswordChangedProps;
