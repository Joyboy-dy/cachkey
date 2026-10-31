import { EmailLayout } from "../components/email-layout";
import {
  EmailButton,
  EmailFallbackLink,
  EmailHeading,
  EmailMuted,
  EmailText,
} from "../components/primitives";

export type InvitationProps = {
  appUrl: string;
  inviterName: string;
  organizationName: string;
  /** Already translated: « membre », « administrateur »… */
  roleLabel: string;
  acceptUrl: string;
};

export default function Invitation({
  appUrl,
  inviterName,
  organizationName,
  roleLabel,
  acceptUrl,
}: InvitationProps) {
  return (
    <EmailLayout appUrl={appUrl}>
      <EmailHeading>Rejoignez {organizationName}</EmailHeading>
      <EmailText>Bonjour,</EmailText>
      <EmailText>
        {inviterName} vous invite à rejoindre l’organisation {organizationName} sur Cachkey, en tant
        que {roleLabel}. Vous pourrez accéder aux projets et aux variables qui vous seront partagés.
      </EmailText>
      <EmailButton href={acceptUrl}>Voir l’invitation</EmailButton>
      <EmailFallbackLink href={acceptUrl} />
      <EmailMuted>
        Cette invitation expire dans 7 jours. Si vous ne connaissez pas {inviterName}, ignorez
        simplement cet email.
      </EmailMuted>
    </EmailLayout>
  );
}

Invitation.PreviewProps = {
  appUrl: "http://localhost:3000",
  inviterName: "Awa Mensah",
  organizationName: "Studio Awa",
  roleLabel: "membre",
  acceptUrl: "http://localhost:3000/invitation/exemple",
} satisfies InvitationProps;
