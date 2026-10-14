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
      { name: "theme-color", content: "#1A1A1A" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
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
