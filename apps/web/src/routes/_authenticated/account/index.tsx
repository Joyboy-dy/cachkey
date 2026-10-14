import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AvatarCard } from "@/components/account/avatar-card";
import { DeleteAccountCard, EmailCard, NameCard } from "@/components/account/profile-cards";
import type { Feedback } from "@/components/app/feedback";

const searchSchema = z.object({
  /** Set when an email-change link (current or new address) redirects back here. */
  email: z.literal("confirmed").optional().catch(undefined),
  /** Better Auth appends `?error=` when such a link is invalid or expired. */
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/account/")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Profil · Cachkey" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session } = Route.useRouteContext();
  const search = Route.useSearch();
  const { user } = session;

  let emailNotice: Feedback = null;
  if (search.error) {
    emailNotice = { tone: "error", message: "Ce lien est invalide ou a expiré." };
  } else if (search.email) {
    emailNotice = {
      tone: "success",
      message:
        "Lien validé. Si l’adresse affichée n’a pas encore changé, ouvrez le lien envoyé à votre nouvelle adresse pour terminer.",
    };
  }

  return (
    <>
      <AvatarCard user={user} />
      <NameCard user={user} />
      <EmailCard user={user} notice={emailNotice} />
      <DeleteAccountCard user={user} />
    </>
  );
}
