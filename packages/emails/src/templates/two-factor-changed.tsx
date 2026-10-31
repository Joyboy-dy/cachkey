import { EmailLayout } from "../components/email-layout";
import { EmailButton, EmailHeading, EmailMuted, EmailText } from "../components/primitives";

export type TwoFactorChangedProps = {
  appUrl: string;
  name: string;
  /** `enabled` / `disabled`: from the account settings · `backup-codes`: new codes generated. */
  reason: "enabled" | "disabled" | "backup-codes";
};

const CONTENT: Record<TwoFactorChangedProps["reason"], { heading: string; body: string }> = {
  enabled: {
    heading: "Double authentification activée",
    body: "La double authentification vient d’être activée sur votre compte Cachkey. À chaque connexion par email et mot de passe, un code de votre application d’authentification vous sera demandé.",
  },
  disabled: {
    heading: "Double authentification désactivée",
    body: "La double authentification vient d’être désactivée sur votre compte Cachkey. Votre mot de passe suffit désormais pour vous connecter.",
  },
  "backup-codes": {
    heading: "Nouveaux codes de secours",
    body: "De nouveaux codes de secours viennent d’être créés pour votre compte Cachkey. Les anciens ne fonctionnent plus.",
  },
};

export default function TwoFactorChanged({ appUrl, name, reason }: TwoFactorChangedProps) {
  const { heading, body } = CONTENT[reason];
  return (
    <EmailLayout appUrl={appUrl}>
      <EmailHeading>{heading}</EmailHeading>
      <EmailText>Bonjour {name},</EmailText>
      <EmailText>{body}</EmailText>
      <EmailButton href={`${appUrl}/account/security`}>Voir la sécurité du compte</EmailButton>
      <EmailMuted>
        Si vous n’êtes pas à l’origine de ce changement, changez immédiatement votre mot de passe et
        contactez l’administrateur de votre instance.
      </EmailMuted>
    </EmailLayout>
  );
}

TwoFactorChanged.PreviewProps = {
  appUrl: "http://localhost:3000",
  name: "Alex",
  reason: "enabled",
} satisfies TwoFactorChangedProps;
