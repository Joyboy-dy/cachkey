import { type BrickDto, brickSchema, MAX_BRICKS } from "@cachkey/shared";
import { Add01Icon, CubeIcon, Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmByTypingDialog } from "@/components/app/confirm";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { bricksApi, bricksQueryOptions } from "@/lib/secrets";
import type { ApiError } from "@/lib/workspace";

/*
 * Bricks of a project (owners and admins): independent parts such as the front-end and the
 * API, each with its own variables, sharing the environments, members and shared variables.
 * A project starts with its main brick only, and nothing about bricks shows elsewhere.
 */

type BrickDialog =
  | { type: "create" }
  | { type: "rename"; brick: BrickDto }
  | { type: "delete"; brick: BrickDto }
  | null;

export function BricksCard({
  organizationId,
  projectSlug,
}: {
  organizationId: string;
  projectSlug: string;
}) {
  const queryClient = useQueryClient();
  const { data: bricks } = useSuspenseQuery(bricksQueryOptions(organizationId, projectSlug));
  const [dialog, setDialog] = useState<BrickDialog>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const split = bricks.length > 1;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["bricks", organizationId, projectSlug] });
    await queryClient.invalidateQueries({ queryKey: ["tokens", organizationId, projectSlug] });
    setDialog(null);
  }

  const deleting = dialog?.type === "delete" ? dialog.brick : null;

  return (
    <div id="briques" className="scroll-mt-24">
      <SectionCard
        title="Briques"
        description="Découpez le projet en parties indépendantes, comme le front-end et l’API : chacune a ses propres variables, et les variables partagées s’ajoutent à toutes."
        aside={
          <Button
            variant="outline"
            size="sm"
            disabled={bricks.length >= MAX_BRICKS}
            title={
              bricks.length >= MAX_BRICKS
                ? `Un projet compte au plus ${MAX_BRICKS} briques.`
                : undefined
            }
            onClick={() => {
              setFeedback(null);
              setDialog({ type: "create" });
            }}
          >
            <Icon icon={Add01Icon} />
            <span className="sr-only sm:not-sr-only">Ajouter une brique</span>
          </Button>
        }
      >
        {feedback ? (
          <FeedbackAlert feedback={feedback} className="mx-5 mt-5 w-auto sm:mx-6" />
        ) : null}
        <ul className="divide-y">
          {bricks.map((brick) => (
            <li key={brick.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <Icon icon={CubeIcon} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm leading-5 font-medium">
                  {split ? (
                    <Link
                      to="/projects/$slug"
                      params={{ slug: projectSlug }}
                      search={{ brick: brick.slug }}
                      className="truncate hover:underline"
                    >
                      {brick.name}
                    </Link>
                  ) : (
                    <span className="truncate">{brick.name}</span>
                  )}
                  {brick.main ? <StatusPill>Brique principale</StatusPill> : null}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {brick.main && !split
                    ? "Toutes les variables du projet. Ajoutez une brique pour en séparer une partie."
                    : `Dans la ligne de commande : --brick ${brick.slug}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setDialog({ type: "rename", brick })}
                aria-label={`Renommer ${brick.name}`}
              >
                <Icon icon={PencilEdit02Icon} />
              </Button>
              {brick.main ? null : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDialog({ type: "delete", brick })}
                  aria-label={`Supprimer ${brick.name}`}
                >
                  <Icon icon={Delete02Icon} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      <BrickNameDialog
        open={dialog?.type === "create" || dialog?.type === "rename"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        brick={dialog?.type === "rename" ? dialog.brick : undefined}
        firstSplit={!split}
        onSubmit={async (name) => {
          const { data, error } =
            dialog?.type === "rename"
              ? await bricksApi.rename(projectSlug, dialog.brick.slug, { name })
              : await bricksApi.create(projectSlug, { name });
          if (error) return error;
          await refresh();
          setFeedback({
            tone: "success",
            message:
              dialog?.type === "rename"
                ? "La brique a été renommée."
                : `La brique ${data.name} a été ajoutée. Choisissez-la à côté de l’environnement, dans l’onglet Variables.`,
          });
          return null;
        }}
      />

      <ConfirmByTypingDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={`Supprimer ${deleting?.name ?? ""} ?`}
        description="Cette action est définitive."
        consequences={[
          "Ses variables et leur historique seront supprimés dans tous les environnements.",
          "Ses jetons d’accès cesseront de fonctionner.",
          "Les variables partagées et les autres briques ne changent pas.",
        ]}
        expected={deleting?.name ?? ""}
        confirmLabel="Supprimer la brique"
        onConfirm={async () => {
          if (!deleting) return null;
          const { error } = await bricksApi.remove(projectSlug, deleting.slug);
          if (error) return getAuthErrorMessage(error);
          queryClient.removeQueries({ queryKey: ["secrets", organizationId, projectSlug] });
          await queryClient.invalidateQueries({
            queryKey: ["environments", organizationId, projectSlug],
          });
          await refresh();
          setFeedback({ tone: "success", message: `La brique ${deleting.name} a été supprimée.` });
          return null;
        }}
      />
    </div>
  );
}

function BrickNameDialog({
  open,
  onOpenChange,
  brick,
  firstSplit,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brick?: BrickDto;
  /** The project has a single brick yet: explain what adding one changes. */
  firstSplit: boolean;
  onSubmit: (name: string) => Promise<ApiError | null>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{brick ? "Renommer la brique" : "Ajouter une brique"}</DialogTitle>
          <DialogDescription>
            {brick
              ? "Les dossiers liés et les jetons d’accès continuent de fonctionner."
              : firstSplit
                ? "Les variables actuelles restent dans la brique principale. Vous pourrez ensuite ranger les variables communes dans les variables partagées."
                : "Utilisez le nom de la partie concernée : web, api, worker…"}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <BrickNameForm initial={brick?.name ?? ""} editing={Boolean(brick)} onSubmit={onSubmit} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BrickNameForm({
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
    validators: { onDynamic: brickSchema },
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
              placeholder={editing ? undefined : "web"}
              autoComplete="off"
              autoFocus
            />
          )}
        </form.AppField>
        <form.SubmitButton requireChanges={editing}>
          {editing ? "Renommer" : "Ajouter la brique"}
        </form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
