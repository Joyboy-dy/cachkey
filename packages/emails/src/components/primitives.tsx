import { Button, Heading, Link, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { brand } from "./brand";

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h1"
      style={{ fontSize: 24, lineHeight: "30px", fontWeight: 700, margin: "0 0 16px" }}
    >
      {children}
    </Heading>
  );
}

export function EmailText({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 16, lineHeight: "24px", margin: "0 0 16px" }}>{children}</Text>;
}

export function EmailMuted({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 13, lineHeight: "20px", color: brand.muted, margin: "16px 0 0" }}>
      {children}
    </Text>
  );
}

/** Primary action: orange background with ink label (brand accessibility rule). */
export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: brand.orange,
        color: brand.ink,
        fontSize: 15,
        fontWeight: 600,
        borderRadius: 8,
        padding: "12px 20px",
        textDecoration: "none",
        display: "inline-block",
      }}
    >
      {children}
    </Button>
  );
}

/** Fallback raw link for clients that block buttons. */
export function EmailFallbackLink({ href }: { href: string }) {
  return (
    <EmailMuted>
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
      <br />
      <Link
        href={href}
        style={{
          color: brand.ink,
          fontFamily: brand.fontMono,
          fontSize: 12,
          wordBreak: "break-all",
        }}
      >
        {href}
      </Link>
    </EmailMuted>
  );
}
