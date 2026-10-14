import { canManage } from "@cachkey/shared";
import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/app/page";
import {
  MembersCard,
  OrganizationDangerCard,
  OrganizationGeneralCard,
} from "@/components/organization/organization-cards";
import { InvitationsCard } from "@/components/organization/invitations-card";
import { organizationInvitationsQueryOptions } from "@/lib/collaboration";
import { membersQueryOptions } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/organization")({
  loader: async ({ context }) => {
    const { queryClient, organization } = context;
    await Promise.all([
      queryClient.ensureQueryData(membersQueryOptions(organization.id)),
      canManage(organization.role)
        ? queryClient.ensureQueryData(organizationInvitationsQueryOptions(organization.id))
        : null,
    ]);
  },
  head: () => ({ meta: [{ title: "Organisation · Cachkey" }] }),
  component: OrganizationPage,
});

function OrganizationPage() {
  const { organization, session } = Route.useRouteContext();

  return (
    <PageContainer>
      <PageHeader
        title="Organisation"
        description="Le nom, les membres, les invitations et les rôles de votre organisation."
      />
      <div className="mt-8 grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
        {/* key: remount forms when switching organisation */}
        <OrganizationGeneralCard key={`general-${organization.id}`} organization={organization} />
        <MembersCard organization={organization} viewerId={session.user.id} />
        {canManage(organization.role) ? <InvitationsCard organization={organization} /> : null}
        <OrganizationDangerCard key={`danger-${organization.id}`} organization={organization} />
      </div>
    </PageContainer>
  );
}
