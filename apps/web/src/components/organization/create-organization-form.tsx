import { organizationSchema, slugify } from "@cachkey/shared";
import { revalidateLogic } from "@tanstack/react-form";
import { useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { useAppForm } from "@/components/form/form";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";

/** Globally unique, never shown: the readable part comes from the name. */
function organizationSlug(name: string): string {
  const base = slugify(name) || "organisation";
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

type CreateOrganizationFormProps = {
  /** Called once the organisation exists and is the active one. */
  onCreated: () => Promise<void> | void;
  submitLabel?: string;
  autoFocus?: boolean;
};

export function CreateOrganizationForm({
  onCreated,
  submitLabel = "Créer l’organisation",
  autoFocus,
}: CreateOrganizationFormProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);

  const form = useAppForm({
    defaultValues: { name: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: organizationSchema },
    onSubmit: async ({ value }) => {
      setFeedback(null);
      const name = value.name.trim();
      // Better Auth makes the new organisation the active one.
      const { error } = await authClient.organization.create({
        name,
        slug: organizationSlug(name),
      });
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      await onCreated();
    },
  });

  return (
    <form.AppForm>
      <form.Form className="grid gap-5">
        <FeedbackAlert feedback={feedback} />
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Nom de l’organisation"
              placeholder="Mon équipe"
              autoComplete="organization"
              description="Votre entreprise, votre équipe ou vos projets personnels."
              autoFocus={autoFocus}
            />
          )}
        </form.AppField>
        <form.SubmitButton>{submitLabel}</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
