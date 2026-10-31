import { Head, Html } from "@react-email/components";
import type { ReactNode } from "react";
import { brand } from "./brand";

export type EmailLayoutProps = {
  /** Public origin of the web app, used to load the logo. */
  appUrl: string;
  /** Primitives from `./primitives` only: each one renders a table row of the card. */
  children: ReactNode;
};

/*
 * Mail clients support CSS very unevenly (scores: Mailpit « HTML Check », caniemail.com).
 * The layout therefore relies on tables and HTML attributes (`bgcolor`, `width`, `align`,
 * `cellPadding`), read by every client, and keeps CSS to a few well-supported properties:
 * colours, fonts, `padding`, `line-height`, `max-width`, `border`, `border-radius`.
 * No `margin`, `display`, hidden preview text or `<hr>`: clients show the heading as preview.
 */
export function EmailLayout({ appUrl, children }: EmailLayoutProps) {
  return (
    <Html lang="fr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body style={{ backgroundColor: brand.warmWhite }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          bgcolor={brand.warmWhite}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px" }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{ maxWidth: 520 }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: "0 8px 24px" }}>
                        <img
                          src={`${appUrl}/brand/cachkey-horizontal-couleur.png`}
                          alt="Cachkey"
                          width={160}
                          height={34}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td
                        bgcolor="#FFFFFF"
                        style={{
                          border: `1px solid ${brand.border}`,
                          borderRadius: 12,
                          padding: "32px 32px 16px",
                        }}
                      >
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                        >
                          <tbody>{children}</tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "24px 8px 0",
                          color: brand.muted,
                          fontFamily: brand.font,
                          fontSize: 12,
                          lineHeight: "18px",
                        }}
                      >
                        Cachkey · Vos secrets. Votre maîtrise.
                        <br />
                        Vous recevez cet email suite à une action sur votre compte Cachkey.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </Html>
  );
}
