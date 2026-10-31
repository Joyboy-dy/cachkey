import { type CSSProperties, Fragment, type ReactNode } from "react";
import { brand } from "./brand";

/*
 * Each primitive is one row of the card table (see `EmailLayout`): spacing comes from the
 * cell's bottom padding, never from `margin`, which mail clients handle unevenly.
 */

function Row({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return (
    <tr>
      <td style={{ color: brand.ink, fontFamily: brand.font, paddingBottom: 16, ...style }}>
        {children}
      </td>
    </tr>
  );
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Row style={{ fontSize: 24, lineHeight: "30px" }}>
      <b>{children}</b>
    </Row>
  );
}

export function EmailText({ children }: { children: ReactNode }) {
  return <Row style={{ fontSize: 16, lineHeight: "24px" }}>{children}</Row>;
}

export function EmailMuted({ children }: { children: ReactNode }) {
  return <Row style={{ color: brand.muted, fontSize: 13, lineHeight: "20px" }}>{children}</Row>;
}

/**
 * Primary action: orange background with ink label (brand accessibility rule). The colour
 * sits on the cell (`bgcolor`), so it shows even where links cannot be styled.
 */
export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Row style={{ paddingTop: 8, paddingBottom: 24 }}>
      <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
        <tbody>
          <tr>
            <td bgcolor={brand.orange} style={{ borderRadius: 8, padding: "12px 20px" }}>
              <a
                href={href}
                target="_blank"
                style={{
                  color: brand.ink,
                  fontFamily: brand.font,
                  fontSize: 15,
                  lineHeight: "20px",
                  textDecoration: "none",
                }}
              >
                <b>{children}</b>
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </Row>
  );
}

/**
 * Fallback raw link for clients that block buttons. Links carry long tokens without break
 * opportunities: `<wbr>` lets them wrap on narrow screens (instead of `word-break`, poorly
 * supported) and, unlike a zero-width space, is never copied with the address.
 */
export function EmailFallbackLink({ href }: { href: string }) {
  const chunks = href.match(/.{1,24}/g) ?? [href];
  return (
    <EmailMuted>
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
      <br />
      <a
        href={href}
        target="_blank"
        style={{ color: brand.ink, fontFamily: brand.fontMono, fontSize: 12 }}
      >
        {chunks.map((chunk, index) => (
          // Chunks of one fixed address: the index is a stable key.
          <Fragment key={index}>
            {index > 0 ? <wbr /> : null}
            {chunk}
          </Fragment>
        ))}
      </a>
    </EmailMuted>
  );
}
