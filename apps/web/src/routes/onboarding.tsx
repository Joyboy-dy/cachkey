import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthHeader, AuthShell } from "@/components/auth/auth-shell";
import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { OrgAvatar } from "@/components/organization/org-avatar";
import { Icon } from "@/components/ui/icon";
import { authClient } from "@/lib/auth/auth-client";
import { sessionQueryOptions } from "@/lib/auth/session";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { myInvitationsQueryOptions } from "@/lib/collaboration";
import { useRefreshWorkspace, workspaceQueryOptions } from "@/lib/workspace";

/**
 * First step after sign-up (or after leaving/deleting one's last organisation):
 * create an organisation, or pick one the user already belongs to.
 */
export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions());
    if (!session) throw redirect({ to: "/sign-in", search: { redirect: "/onboarding" } });
    const workspace = await context.queryClient.fetchQuery(workspaceQueryOptions());
    if (workspace.active) throw redirect({ to: "/dashboard" });
    const invitations = await context.queryClient.fetchQuery(myInvitationsQueryOptions());
    return { session, workspace, invitations };
  },
  head: () => ({ meta: [{ title: "Votre organisation · Cachkey" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { session, workspace, invitations } = Route.useRouteContext();
  const navigate = useNavigate();
  const refreshWorkspace = useRefreshWorkspace();
  const { signOut, isPending: signingOut } = useSignOut();
  const [joining, setJoining] = useState<string | null>(null);
  const firstName = session.user.name.split(" ")[0] || session.user.name;

  async function enter() {
    await refreshWorkspace();
    await navigate({ to: "/dashboard", replace: true });
  }

  async function select(organizationId: string) {
    setJoining(organizationId);
    const { error } = await authClient.organization.setActive({ organizationId });
    if (error) {
      setJoining(null);
      return;
    }
    await enter();
  }

  const hasOrganizations = workspace.organizations.length > 0;

  return (
    <AuthShell>
      <AuthHeader
        title={hasOrganizations ? "Choisissez une organisation" : `Bienvenue, ${firstName}`}
        description={
          hasOrganizations
            ? "Reprenez l’une de vos organisations ou créez-en une nouvelle."
            : "Créez votre organisation : elle regroupera vos projets et, plus tard, votre équipe."
        }
      />

      {invitations.length > 0 ? (
        <section aria-labelledby="invitations-title" className="mb-7">
          <h2 id="invitations-title" className="mb-3 text-sm font-medium">
            Invitations reçues
          </h2>
          <ul className="grid gap-2">
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <Link
                  to="/invitation/$id"
                  params={{ id: invitation.id }}
                  className="flex w-full items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {invitation.organizationName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Invitation de {invitation.inviterName}
                    </span>
                  </span>
                  <Icon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasOrganizations ? (
        <>
          <ul className="mb-7 grid gap-2">
            {workspace.organizations.map((organization) => (
              <li key={organization.id}>
                <button
                  type="button"
                  onClick={() => void select(organization.id)}
                  disabled={joining !== null}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-foreground/40 hover:bg-accent disabled:opacity-60"
                >
                  <OrgAvatar id={organization.id} />
                  <span className="min-w-0 flex-1 truncate">{organization.name}</span>
                  <Icon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mb-4 text-sm font-medium">Ou créez une nouvelle organisation</p>
        </>
      ) : null}

      <CreateOrganizationForm onCreated={enter} autoFocus={!hasOrganizations} />

      <p className="mt-7 border-t pt-6 text-center text-sm text-muted-foreground">
        Connecté en tant que{" "}
        <span className="font-medium text-foreground">{session.user.email}</span>.{" "}
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-foreground"
        >
          Se déconnecter
        </button>
      </p>
    </AuthShell>
  );
}
