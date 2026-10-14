import { type ProjectDto, type ProjectInput, projectSchema } from "@cachkey/shared";
import { revalidateLogic } from "@tanstack/react-form";
import { useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { useAppForm } from "@/components/form/form";
import { getAuthErrorMessage } from "@/lib/auth/errors";

type ProjectFormProps = {
  initial?: Pick<ProjectDto, "name" | "description">;
  submitLabel: string;
  /** Returns an error code to display, or nothing on success. */
  onSubmit: (input: ProjectInput) => Promise<{ code?: string; status?: number } | null>;
  /** Shown after a successful submit (edit form); the create form navigates away. */
  successMessage?: string;
  autoFocus?: boolean;
  /** Compact right-aligned button inside cards; full width in dialogs. */
  layout?: "dialog" | "card";
};

export function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
  successMessage,
  autoFocus,
  layout = "dialog",
}: ProjectFormProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);

  const form = useAppForm({
    defaultValues: { name: initial?.name ?? "", description: initial?.description ?? "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: projectSchema },
    onSubmit: async ({ value, formApi }) => {
      setFeedback(null);
      const input = { name: value.name.trim(), description: value.description.trim() };
      const error = await onSubmit(input);
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      } else if (successMessage) {
        // The saved values become the new reference: « Enregistrer » turns off again.
        formApi.reset(input);
        setFeedback({ tone: "success", message: successMessage });
      }
    },
  });

  const fields = (
    <>
      <FeedbackAlert feedback={feedback} />
      <form.AppField name="name">
        {(field) => (
          <field.TextField
            label="Nom du projet"
            placeholder="API de paiement"
            autoComplete="off"
            autoFocus={autoFocus}
          />
        )}
      </form.AppField>
      <form.AppField name="description">
        {(field) => (
          <field.TextareaField label="Description" optional placeholder="À quoi sert ce projet ?" />
        )}
      </form.AppField>
    </>
  );

  return (
    <form.AppForm>
      {layout === "dialog" ? (
        <form.Form className="grid gap-5">
          {fields}
          <form.SubmitButton>{submitLabel}</form.SubmitButton>
        </form.Form>
      ) : (
        <form.Form>
          <div className="grid gap-5 px-5 py-5 sm:px-6">{fields}</div>
          <div className="flex justify-end border-t px-5 py-3.5 sm:px-6">
            <form.SubmitButton size="default" className="w-full sm:w-auto" requireChanges>
              {submitLabel}
            </form.SubmitButton>
          </div>
        </form.Form>
      )}
    </form.AppForm>
  );
}
