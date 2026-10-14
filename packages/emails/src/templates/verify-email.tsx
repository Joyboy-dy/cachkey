import { EmailLayout } from "../components/email-layout";
import {
  EmailButton,
  EmailFallbackLink,
  EmailHeading,
  EmailMuted,
  EmailText,
} from "../components/primitives";

export type VerifyEmailProps = {
  appUrl: string;
  name: string;
  verificationUrl: string;
};

export default function VerifyEmail({ appUrl, name, verificationUrl }: VerifyEmailProps) {
  return (
    <EmailLayout
      preview="Confirmez votre adresse email pour activer votre compte Cachkey."
      appUrl={appUrl}
    >
      <EmailHeading>Confirmez votre adresse email</EmailHeading>
      <EmailText>Bonjour {name},</EmailText>
      <EmailText>
        Pour activer votre compte Cachkey, confirmez que cette adresse vous appartient.
      </EmailText>
      <EmailButton href={verificationUrl}>Confirmer mon adresse</EmailButton>
      <EmailFallbackLink href={verificationUrl} />
      <EmailMuted>
        Ce lien expire dans 1 heure. Si vous n’avez pas créé de compte, ignorez cet email.
      </EmailMuted>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  name: "Alex",
  verificationUrl: "http://localhost:3000/api/auth/verify-email?token=exemple",
} satisfies VerifyEmailProps;
