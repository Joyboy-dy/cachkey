import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuthHeader, AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import appCss from "../styles.css?url";

export type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cachkey" },
      {
        name: "description",
        content: "Cachkey — gestion open source et auto-hébergeable des secrets techniques.",
      },
      { name: "theme-color", content: "#FFF5F3", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#141210", media: "(prefers-color-scheme: dark)" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // The theme script sets `class="dark"` before paint, hence suppressHydrationWarning.
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Static, trusted script (no user input): applies the theme before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <AuthShell>
      <AuthHeader
        title="Page introuvable"
        description="Cette page n’existe pas ou a été déplacée."
      />
      <Button asChild size="lg" className="w-full">
        <Link to="/">Retour à l’accueil</Link>
      </Button>
    </AuthShell>
  );
}

function RootError({ reset }: ErrorComponentProps) {
  return (
    <AuthShell>
      <AuthHeader
        title="Une erreur est survenue"
        description="La page n’a pas pu être affichée. Réessayez ; si le problème persiste, contactez l’administrateur de votre instance."
      />
      <div className="grid gap-3">
        <Button size="lg" className="w-full" onClick={reset}>
          Réessayer
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link to="/">Retour à l’accueil</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
