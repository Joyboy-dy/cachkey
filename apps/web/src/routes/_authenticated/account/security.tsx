import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LinkedAccountsCard, PasswordCard } from "@/components/account/security-cards";
import type { Feedback } from "@/components/app/feedback";
import { getOAuthErrorMessage } from "@/lib/auth/errors";
import { publicConfigQueryOptions } from "@/lib/auth/public-config";

const searchSchema = z.object({
  /** Set when a provider was linked successfully. */
  linked: z.literal("1").optional().catch(undefined),
  /** OAuth failure code appended by Better Auth. */
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/account/security")({
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(publicConfigQueryOptions()),
  head: () => ({ meta: [{ title: "Sécurité · Cachkey" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const search = Route.useSearch();

  let notice: Feedback = null;
  if (search.error) {
    notice = { tone: "error", message: getOAuthErrorMessage(search.error) };
  } else if (search.linked) {
    notice = { tone: "success", message: "Le compte a bien été relié." };
  }

  return (
    <>
      <PasswordCard />
      <LinkedAccountsCard notice={notice} />
    </>
  );
}
