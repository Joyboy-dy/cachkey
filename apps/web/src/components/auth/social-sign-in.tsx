import type { SocialProviderId } from "@cachkey/shared";
import { useQuery } from "@tanstack/react-query";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { type ReactNode, useState } from "react";
import { GithubIcon, GoogleIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { publicConfigQueryOptions } from "@/lib/auth/public-config";

const providers: Record<SocialProviderId, { label: string; icon: ReactNode }> = {
  google: { label: "Continuer avec Google", icon: <GoogleIcon className="size-[18px]" /> },
  github: { label: "Continuer avec GitHub", icon: <GithubIcon className="size-[18px]" /> },
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
            {pending === id ? (
              <Icon icon={Loading03Icon} className="animate-spin" aria-hidden />
            ) : (
              providers[id].icon
            )}
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
