import {
  CommandLineIcon,
  ComputerIcon,
  Loading03Icon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionsQueryOptions } from "@/lib/auth/account";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { formatDateTime } from "@/lib/date";
import { describeUserAgent } from "@/lib/user-agent";

export const Route = createFileRoute("/_authenticated/account/sessions")({
  head: () => ({ meta: [{ title: "Appareils · Cachkey" }] }),
  component: SessionsPage,
});

function SessionsPage() {
  const { session: current } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: sessions, isPending } = useQuery(sessionsQueryOptions());
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Current device first, then the most recently active.
  const sorted = [...(sessions ?? [])].sort((a, b) => {
    if (a.id === current.session.id) return -1;
    if (b.id === current.session.id) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const others = sorted.filter((item) => item.id !== current.session.id);

  async function run(key: string, action: () => Promise<{ error: unknown }>, success: string) {
    setPending(key);
    setFeedback(null);
    const { error } = await action();
    if (error) {
      setFeedback({
        tone: "error",
        message: getAuthErrorMessage(error as { code?: string; status?: number }),
      });
    } else {
      await queryClient.invalidateQueries({ queryKey: sessionsQueryOptions().queryKey });
      setFeedback({ tone: "success", message: success });
    }
    setPending(null);
  }

  return (
    <SectionCard
      title="Appareils connectés"
      description="Les navigateurs et terminaux (ligne de commande) actuellement connectés à votre compte."
      aside={
        others.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending !== null}
            onClick={() =>
              run(
                "others",
                () => authClient.revokeOtherSessions(),
                "Vos autres appareils ont été déconnectés.",
              )
            }
          >
            {pending === "others" ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
            Déconnecter les autres
          </Button>
        ) : null
      }
    >
      {feedback ? <FeedbackAlert feedback={feedback} className="mx-5 mt-5 w-auto sm:mx-6" /> : null}

      {isPending || !sessions ? (
        <div className="grid gap-3 px-5 py-5 sm:px-6" aria-hidden>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <ul className="divide-y">
          {sorted.map((item) => {
            const device = describeUserAgent(item.userAgent);
            const isCurrent = item.id === current.session.id;
            return (
              <li key={item.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Icon
                    icon={
                      device.cli ? CommandLineIcon : device.mobile ? SmartPhone01Icon : ComputerIcon
                    }
                    className="size-5"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm leading-5 font-medium">
                    {device.label}
                    {isCurrent ? <StatusPill tone="success">Cet appareil</StatusPill> : null}
                  </p>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Dernière activité le {formatDateTime(item.updatedAt)}
                  </p>
                </div>
                {isCurrent ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending !== null}
                    onClick={() =>
                      run(
                        item.id,
                        () => authClient.revokeSession({ token: item.token }),
                        `${device.label} a été déconnecté.`,
                      )
                    }
                  >
                    {pending === item.id ? (
                      <Icon icon={Loading03Icon} className="animate-spin" />
                    ) : null}
                    Déconnecter
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
