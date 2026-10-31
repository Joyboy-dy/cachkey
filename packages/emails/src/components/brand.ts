/** Brand tokens for emails — see cachkey-brandmark (Guide de marque 1.0). */
export const brand = {
  orange: "#F97316",
  ink: "#1A1A1A",
  warmWhite: "#FFF5F3",
  muted: "#5C5552",
  border: "#F1E4E0",
  font: "Geist, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontMono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

/*
 * Mail clients read the `bgcolor` attribute of table cells more reliably than CSS
 * backgrounds (see email-layout.tsx); React passes it through but its types omit it.
 */
declare module "react" {
  // The type parameter must repeat React's declaration for the interfaces to merge.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TdHTMLAttributes<T> {
    bgcolor?: string;
  }
}
