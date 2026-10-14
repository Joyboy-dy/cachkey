import type { SocialProviderId } from "@cachkey/shared";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { publicConfigQueryOptions } from "@/lib/auth/public-config";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.94 11.94 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  );
}

const providers: Record<SocialProviderId, { label: string; icon: ReactNode }> = {
  google: { label: "Continuer avec Google", icon: <GoogleIcon /> },
  github: { label: "Continuer avec GitHub", icon: <GitHubIcon /> },
};

type SocialSignInProps = {
  /** Where to land after a successful OAuth sign-in. */
  callbackPath: string;
  /** Page receiving `?error=` if the provider flow fails. */
  errorPath: "/sign-in" | "/sign-up";
  onError: (message: string) => void;
};

/**
 * OAuth buttons — only providers configured on the instance are displayed.
 * Renders nothing (including the separator) when no provider is enabled.
 */
export function SocialSignIn({ callbackPath, errorPath, onError }: SocialSignInProps) {
  const { data } = useQuery(publicConfigQueryOptions());
  const [pending, setPending] = useState<SocialProviderId | null>(null);
  const enabled = data?.socialProviders ?? [];

  if (enabled.length === 0) return null;

  async function signIn(provider: SocialProviderId) {
    setPending(provider);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: callbackPath,
      errorCallbackURL: errorPath,
    });
    // On success the browser is redirected to the provider; we only get here on failure.
    if (error) {
      onError(getAuthErrorMessage(error));
      setPending(null);
    }
  }

  return (
    <div className="mb-6">
      <div className="grid gap-3">
        {enabled.map((id) => (
          <Button
            key={id}
            type="button"
            variant="outline"
            size="lg"
            className="w-full font-medium"
            disabled={pending !== null}
            onClick={() => signIn(id)}
          >
            {pending === id ? <Loader2 className="animate-spin" aria-hidden /> : providers[id].icon}
            {providers[id].label}
          </Button>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground" role="separator">
        <span className="h-px flex-1 bg-border" />
        ou avec votre email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
