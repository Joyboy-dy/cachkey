import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/app/page";
import {
  MembersCard,
  OrganizationDangerCard,
  OrganizationGeneralCard,
} from "@/components/organization/organization-cards";
import { membersQueryOptions } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/organization")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(membersQueryOptions(context.organization.id)),
  head: () => ({ meta: [{ title: "Organisation · Cachkey" }] }),
  component: OrganizationPage,
});

function OrganizationPage() {
  const { organization, session } = Route.useRouteContext();

  return (
    <PageContainer>
      <PageHeader
        title="Organisation"
        description="Le nom, les membres et les rôles de votre organisation."
      />
      <div className="mt-8 grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
        {/* key: remount forms when switching organisation */}
        <OrganizationGeneralCard key={`general-${organization.id}`} organization={organization} />
        <MembersCard organization={organization} viewerId={session.user.id} />
        <OrganizationDangerCard key={`danger-${organization.id}`} organization={organization} />
      </div>
    </PageContainer>
  );
}
