import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ACCOUNT_SECTIONS } from "@/components/app/navigation";
import { PageContainer, PageHeader } from "@/components/app/page";

/** « Mon compte » layout: shared header and section tabs (Profil, Sécurité, Appareils). */
export const Route = createFileRoute("/_authenticated/account")({
  component: AccountLayout,
});

function AccountLayout() {
  return (
    <PageContainer>
      <PageHeader
        title="Mon compte"
        description="Gérez votre profil, la sécurité de votre compte et vos appareils connectés."
      />

      <nav aria-label="Sections du compte" className="mt-6 border-b">
        <ul className="-mb-px flex gap-6 overflow-x-auto">
          {ACCOUNT_SECTIONS.map((section) => (
            <li key={section.to}>
              <Link
                to={section.to}
                activeOptions={{ exact: true }}
                className="inline-flex h-10 items-center border-b-2 border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground"
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 grid max-w-3xl gap-6">
        <Outlet />
      </div>
    </PageContainer>
  );
}
