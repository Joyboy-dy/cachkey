import { Loading03Icon } from "@hugeicons/core-free-icons";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { AuthHeader, AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { textLinkVariants } from "@/components/ui/text-link";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { sessionQueryOptions } from "@/lib/auth/session";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { getInvitation } from "@/lib/collaboration";
import { formatDate } from "@/lib/date";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useRefreshWorkspace } from "@/lib/workspace";

/** Landing page of the invitation email: accept or decline joining an organisation. */
export const Route = createFileRoute("/invitation/$id")({
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions());
    if (!session) {
      throw redirect({ to: "/sign-in", search: { redirect: `/invitation/${params.id}` } });
    }
    return { session };
  },
  loader: ({ params }) => getInvitation({ data: params.id }),
  head: () => ({ meta: [{ title: "Invitation · Cachkey" }] }),
  component: InvitationPage,
});

function InvitationPage() {
  const lookup = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const refreshWorkspace = useRefreshWorkspace();
  const { signOut, isPending: signingOut } = useSignOut();
  const [pending, setPending] = useState<"accept" | "reject" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [declined, setDeclined] = useState(false);

  const invitation = lookup.invitation;

  async function accept() {
    if (!invitation) return;
    setPending("accept");
    setFeedback(null);
    const { data, error } = await authClient.organization.acceptInvitation({
      invitationId: invitation.id,
    });
    if (error) {
      setPending(null);
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      return;
    }
    await authClient.organization.setActive({ organizationId: data.member.organizationId });
    await refreshWorkspace();
    await navigate({ to: "/dashboard", replace: true });
  }

  async function reject() {
    if (!invitation) return;
    setPending("reject");
    setFeedback(null);
    const { error } = await authClient.organization.rejectInvitation({
      invitationId: invitation.id,
    });
    setPending(null);
    if (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      return;
    }
    setDeclined(true);
  }

  const signedInAs = (
    <p className="mt-7 border-t pt-6 text-center text-sm text-muted-foreground">
      Connecté en tant que <span className="font-medium text-foreground">{session.user.email}</span>
      .{" "}
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-foreground"
      >
        Changer de compte
      </button>
    </p>
  );

  if (!invitation) {
    const otherEmail = lookup.error === "other_email";
    return (
      <AuthShell>
        <AuthHeader
          tone="error"
          title={otherEmail ? "Invitation destinée à une autre adresse" : "Invitation introuvable"}
          description={
            otherEmail
              ? "Connectez-vous avec l’adresse email qui a reçu l’invitation pour la consulter."
              : "Ce lien est invalide ou l’invitation a été annulée. Demandez-en une nouvelle à la personne qui vous a invité."
          }
        />
        <GoHome />
        {signedInAs}
      </AuthShell>
    );
  }

  if (declined || invitation.status !== "pending") {
    const titles = {
      accepted: "Invitation déjà acceptée",
      rejected: "Invitation refusée",
      canceled: "Invitation annulée",
      expired: "Invitation expirée",
      pending: "Invitation refusée",
    } as const;
    const descriptions = {
      accepted: `Vous faites déjà partie de ${invitation.organizationName}.`,
      rejected: `Vous avez refusé de rejoindre ${invitation.organizationName}.`,
      canceled: `${invitation.inviterName} a annulé cette invitation.`,
      expired: `Demandez à ${invitation.inviterName} de vous inviter à nouveau.`,
      pending: `Vous avez refusé de rejoindre ${invitation.organizationName}.`,
    } as const;
    const status = declined ? "rejected" : invitation.status;
    return (
      <AuthShell>
        <AuthHeader
          tone={status === "accepted" ? "success" : "error"}
          title={titles[status]}
          description={descriptions[status]}
        />
        <GoHome />
        {signedInAs}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeader
        title={`Rejoindre ${invitation.organizationName}`}
        description={
          <>
            {invitation.inviterName} vous invite à rejoindre cette organisation en tant que{" "}
            <span className="font-medium text-foreground">
              {roleLabel(invitation.role).toLowerCase()}
            </span>
            . L’invitation est valable jusqu’au {formatDate(invitation.expiresAt)}.
          </>
        }
      />
      <FeedbackAlert feedback={feedback} className="mb-5" />
      <div className="grid gap-3">
        <Button size="lg" onClick={() => void accept()} disabled={pending !== null}>
          {pending === "accept" ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
          Rejoindre {invitation.organizationName}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => void reject()}
          disabled={pending !== null}
        >
          {pending === "reject" ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
          Refuser
        </Button>
      </div>
      {signedInAs}
    </AuthShell>
  );
}

function GoHome() {
  return (
    <Link to="/dashboard" className={cn(textLinkVariants(), "text-sm")}>
      Aller à mon espace
    </Link>
  );
}
