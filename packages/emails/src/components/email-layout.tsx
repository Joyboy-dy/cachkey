import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { brand } from "./brand";

export type EmailLayoutProps = {
  /** Short text shown by mail clients next to the subject. */
  preview: string;
  /** Public origin of the web app, used to load the logo. */
  appUrl: string;
  children: ReactNode;
};

export function EmailLayout({ preview, appUrl, children }: EmailLayoutProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: brand.warmWhite, fontFamily: brand.font, margin: 0 }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px" }}>
          <Section style={{ padding: "0 8px 24px" }}>
            <Img
              src={`${appUrl}/brand/cachkey-horizontal-couleur.png`}
              alt="Cachkey"
              width="160"
              height="34"
            />
          </Section>
          <Section
            style={{
              backgroundColor: "#FFFFFF",
              border: `1px solid ${brand.border}`,
              borderRadius: 12,
              padding: "32px 32px 24px",
              color: brand.ink,
            }}
          >
            {children}
          </Section>
          <Hr style={{ borderColor: brand.border, margin: "24px 0 16px" }} />
          <Text style={{ color: brand.muted, fontSize: 12, lineHeight: "18px", margin: 0 }}>
            Cachkey · Vos secrets. Votre maîtrise.
            <br />
            Vous recevez cet email suite à une action sur votre compte Cachkey.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
