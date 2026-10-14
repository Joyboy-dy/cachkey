import { EmailLayout } from "../components/email-layout";
import {
  EmailButton,
  EmailFallbackLink,
  EmailHeading,
  EmailMuted,
  EmailText,
} from "../components/primitives";

export type DeleteAccountProps = {
  appUrl: string;
  name: string;
  deleteUrl: string;
};

export default function DeleteAccount({ appUrl, name, deleteUrl }: DeleteAccountProps) {
  return (
    <EmailLayout preview="Confirmez la suppression de votre compte Cachkey." appUrl={appUrl}>
      <EmailHeading>Suppression de votre compte</EmailHeading>
      <EmailText>Bonjour {name},</EmailText>
      <EmailText>
        Vous avez demandé la suppression de votre compte Cachkey. Cette action est définitive :
        votre profil, vos sessions et vos connexions seront supprimés.
      </EmailText>
      <EmailButton href={deleteUrl}>Supprimer définitivement mon compte</EmailButton>
      <EmailFallbackLink href={deleteUrl} />
      <EmailMuted>
        Ce lien expire dans 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet
        email et changez votre mot de passe : votre compte reste intact.
      </EmailMuted>
    </EmailLayout>
  );
}

DeleteAccount.PreviewProps = {
  appUrl: "http://localhost:3000",
  name: "Alex",
  deleteUrl: "http://localhost:3000/api/auth/delete-user/callback?token=exemple",
} satisfies DeleteAccountProps;
