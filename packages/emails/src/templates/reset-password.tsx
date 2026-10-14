import { EmailLayout } from "../components/email-layout";
import {
  EmailButton,
  EmailFallbackLink,
  EmailHeading,
  EmailMuted,
  EmailText,
} from "../components/primitives";

export type ResetPasswordProps = {
  appUrl: string;
  name: string;
  resetUrl: string;
};

export default function ResetPassword({ appUrl, name, resetUrl }: ResetPasswordProps) {
  return (
    <EmailLayout preview="Réinitialisez le mot de passe de votre compte Cachkey." appUrl={appUrl}>
      <EmailHeading>Réinitialisez votre mot de passe</EmailHeading>
      <EmailText>Bonjour {name},</EmailText>
      <EmailText>
        Une demande de réinitialisation du mot de passe a été faite pour votre compte. Choisissez un
        nouveau mot de passe avec le bouton ci-dessous.
      </EmailText>
      <EmailButton href={resetUrl}>Choisir un nouveau mot de passe</EmailButton>
      <EmailFallbackLink href={resetUrl} />
      <EmailMuted>
        Ce lien expire dans 1 heure et ne peut être utilisé qu’une fois. Si vous n’êtes pas à
        l’origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.
      </EmailMuted>
    </EmailLayout>
  );
}

ResetPassword.PreviewProps = {
  appUrl: "http://localhost:3000",
  name: "Alex",
  resetUrl: "http://localhost:3000/reset-password?token=exemple",
} satisfies ResetPasswordProps;
