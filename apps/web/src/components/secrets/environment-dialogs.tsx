import { type EnvironmentDto, environmentSchema } from "@cachkey/shared";
import { revalidateLogic } from "@tanstack/react-form";
import { useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { useAppForm } from "@/components/form/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import type { ApiError } from "@/lib/workspace";

/** Create (no `environment`) or rename an environment. */
export function EnvironmentNameDialog({
  open,
  onOpenChange,
  environment,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment?: EnvironmentDto;
  onSubmit: (name: string) => Promise<ApiError | null>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {environment ? "Renommer l’environnement" : "Nouvel environnement"}
          </DialogTitle>
          <DialogDescription>
            {environment
              ? "Le lien vers cet environnement ne change pas."
              : "Utilisez le nom que votre équipe emploie déjà : local, preview, qa…"}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <NameForm
            initial={environment?.name ?? ""}
            editing={Boolean(environment)}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  initial,
  editing,
  onSubmit,
}: {
  initial: string;
  editing: boolean;
  onSubmit: (name: string) => Promise<ApiError | null>;
}) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useAppForm({
    defaultValues: { name: initial },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: environmentSchema },
    onSubmit: async ({ value }) => {
      setFeedback(null);
      const error = await onSubmit(value.name.trim());
      if (error) setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
    },
  });

  return (
    <form.AppForm>
      <form.Form className="grid gap-5">
        <FeedbackAlert feedback={feedback} />
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Nom"
              placeholder={editing ? undefined : "preview"}
              autoComplete="off"
              autoFocus
            />
          )}
        </form.AppField>
        <form.SubmitButton requireChanges={editing}>
          {editing ? "Renommer" : "Créer l’environnement"}
        </form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
