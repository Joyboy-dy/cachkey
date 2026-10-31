import { EmailLayout } from "../components/email-layout";
import {
  EmailButton,
  EmailFallbackLink,
  EmailHeading,
  EmailMuted,
  EmailText,
} from "../components/primitives";

export type ConfirmEmailChangeProps = {
  appUrl: string;
  name: string;
  newEmail: string;
  confirmUrl: string;
};

/** Sent to the current address before the account email is changed. */
export default function ConfirmEmailChange({
  appUrl,
  name,
  newEmail,
  confirmUrl,
}: ConfirmEmailChangeProps) {
  return (
    <EmailLayout appUrl={appUrl}>
      <EmailHeading>Changement d’adresse email</EmailHeading>
      <EmailText>Bonjour {name},</EmailText>
      <EmailText>
        Vous avez demandé à remplacer l’adresse de votre compte Cachkey par <b>{newEmail}</b>.
        Confirmez cette demande avec le bouton ci-dessous ; un second email sera ensuite envoyé à la
        nouvelle adresse pour la vérifier.
      </EmailText>
      <EmailButton href={confirmUrl}>Confirmer le changement</EmailButton>
      <EmailFallbackLink href={confirmUrl} />
      <EmailMuted>
        Ce lien expire dans 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet
        email et changez votre mot de passe : votre adresse reste inchangée.
      </EmailMuted>
    </EmailLayout>
  );
}

ConfirmEmailChange.PreviewProps = {
  appUrl: "http://localhost:3000",
  name: "Alex",
  newEmail: "alex@nouvelle-adresse.fr",
  confirmUrl: "http://localhost:3000/api/auth/verify-email?token=exemple",
} satisfies ConfirmEmailChangeProps;
