import type {
  AccessLevel,
  EnvironmentDto,
  ProjectAccessDto,
  ProjectAccessInput,
} from "@cachkey/shared";
import { Loading03Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { UserAvatar } from "@/components/app/user-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { accessApi, projectAccessQueryOptions } from "@/lib/collaboration";
import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Choice = "none" | AccessLevel;

const CHOICES: { value: Choice; label: string; description: string }[] = [
  {
    value: "none",
    label: "Aucun accès",
    description: "Le projet n’apparaît pas pour cette personne.",
  },
  {
    value: "read",
    label: "Lecture",
    description: "Voit les variables, affiche et copie leurs valeurs, exporte le .env.",
  },
  {
    value: "write",
    label: "Lecture et écriture",
    description: "Peut aussi ajouter, modifier, supprimer et importer des variables.",
  },
];

/** Short summary of an access, for the list. */
function summary(entry: ProjectAccessDto, environments: EnvironmentDto[]): string {
  if (entry.role !== "member") return "Accès complet";
  if (!entry.access) return "Aucun accès";
  const level = entry.access.level === "write" ? "Lecture et écriture" : "Lecture";
  if (entry.access.environmentIds.length === 0) return `${level} · tous les environnements`;
  const names = environments
    .filter((environment) => entry.access?.environmentIds.includes(environment.id))
    .map((environment) => environment.name);
  return `${level} · ${names.join(", ")}`;
}

/** Who can see this project: owners and admins always; members only when granted. */
export function AccessCard({
  organizationId,
  projectSlug,
  environments,
}: {
  organizationId: string;
  projectSlug: string;
  environments: EnvironmentDto[];
}) {
  const queryClient = useQueryClient();
  const options = projectAccessQueryOptions(organizationId, projectSlug);
  const { data: entries } = useSuspenseQuery(options);
  const [editing, setEditing] = useState<ProjectAccessDto | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const members = entries.filter((entry) => entry.role === "member");

  return (
    <div id="acces" className="scroll-mt-24">
      <SectionCard
        title="Accès"
        description="Les propriétaires et administrateurs voient tous les projets. Choisissez ce que chaque membre peut faire ici."
      >
        {feedback ? (
          <FeedbackAlert feedback={feedback} className="mx-5 mt-5 w-auto sm:mx-6" />
        ) : null}
        <ul className="divide-y">
          {entries.map((entry) => {
            const editable = entry.role === "member";
            return (
              <li key={entry.user.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <UserAvatar user={entry.user} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm leading-5 font-medium">
                    <span className="truncate">{entry.user.name}</span>
                    {editable ? null : <StatusPill>{ROLE_LABELS[entry.role]}</StatusPill>}
                  </p>
                  <p
                    className={cn(
                      "truncate text-xs leading-5",
                      editable && entry.access ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {summary(entry, environments)}
                  </p>
                </div>
                {editable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFeedback(null);
                      setEditing(entry);
                    }}
                    aria-label={`Modifier l’accès de ${entry.user.name}`}
                  >
                    <Icon icon={PencilEdit02Icon} />
                    <span className="sr-only sm:not-sr-only">Modifier</span>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {members.length === 0 ? (
          <p className="border-t px-5 py-4 text-sm text-muted-foreground sm:px-6">
            Aucun membre à qui donner accès pour l’instant. Invitez des personnes depuis la page
            Organisation.
          </p>
        ) : null}
      </SectionCard>

      <AccessDialog
        entry={editing}
        environments={environments}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSave={async (userId, input) => {
          const { error } = input
            ? await accessApi.set(projectSlug, userId, input)
            : await accessApi.remove(projectSlug, userId);
          if (error) return getAuthErrorMessage(error);
          await queryClient.invalidateQueries({ queryKey: options.queryKey });
          setEditing(null);
          setFeedback({ tone: "success", message: "L’accès a été mis à jour." });
          return null;
        }}
      />
    </div>
  );
}

function AccessDialog({
  entry,
  environments,
  onOpenChange,
  onSave,
}: {
  entry: ProjectAccessDto | null;
  environments: EnvironmentDto[];
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, input: ProjectAccessInput | null) => Promise<string | null>;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accès de {entry?.user.name}</DialogTitle>
          <DialogDescription>{entry?.user.email}</DialogDescription>
        </DialogHeader>
        {entry ? (
          <AccessForm
            key={entry.user.id}
            entry={entry}
            environments={environments}
            onCancel={() => onOpenChange(false)}
            onSave={onSave}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AccessForm({
  entry,
  environments,
  onCancel,
  onSave,
}: {
  entry: ProjectAccessDto;
  environments: EnvironmentDto[];
  onCancel: () => void;
  onSave: (userId: string, input: ProjectAccessInput | null) => Promise<string | null>;
}) {
  const initial = {
    choice: (entry.access?.level ?? "none") as Choice,
    all: !entry.access || entry.access.environmentIds.length === 0,
    selected: entry.access?.environmentIds ?? [],
  };
  const [choice, setChoice] = useState<Choice>(initial.choice);
  const [all, setAll] = useState(initial.all);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sameSelection =
    selected.length === initial.selected.length &&
    selected.every((id) => initial.selected.includes(id));
  const changed =
    choice !== initial.choice ||
    (choice !== "none" && (all !== initial.all || (!all && !sameSelection)));
  const valid = choice === "none" || all || selected.length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!changed || !valid || pending) return;
    setPending(true);
    setError(null);
    const message = await onSave(
      entry.user.id,
      choice === "none" ? null : { level: choice, environmentIds: all ? [] : selected },
    );
    setPending(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="contents">
      <DialogBody className="grid gap-5">
        <FeedbackAlert feedback={error ? { tone: "error", message: error } : null} />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm leading-none font-medium">Niveau d’accès</legend>
          <RadioGroup
            value={choice}
            onValueChange={(value) => setChoice(value as Choice)}
            className="gap-2"
          >
            {CHOICES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 text-sm leading-5 transition-colors",
                  choice === option.value
                    ? "border-primary bg-primary/5"
                    : "hover:border-foreground/30",
                )}
              >
                <RadioGroupItem value={option.value} className="mt-0.5" />
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-muted-foreground">{option.description}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        {choice === "none" ? null : (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm leading-none font-medium">Environnements</legend>
            <RadioGroup
              value={all ? "all" : "some"}
              onValueChange={(value) => setAll(value === "all")}
              className="gap-2"
            >
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <RadioGroupItem value="all" />
                Tous, y compris ceux créés plus tard
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <RadioGroupItem value="some" />
                Seulement certains
              </label>
            </RadioGroup>
            {all ? null : (
              <div className="mt-1 ml-7 grid gap-2 rounded-lg border p-3">
                {environments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ce projet n’a aucun environnement.
                  </p>
                ) : (
                  environments.map((environment) => (
                    <label
                      key={environment.id}
                      className="flex cursor-pointer items-center gap-3 text-sm"
                    >
                      <Checkbox
                        checked={selected.includes(environment.id)}
                        onCheckedChange={(checked) =>
                          setSelected((current) =>
                            checked === true
                              ? [...current, environment.id]
                              : current.filter((id) => id !== environment.id),
                          )
                        }
                      />
                      <span className="font-mono text-[13px]">{environment.name}</span>
                    </label>
                  ))
                )}
                {selected.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Cochez au moins un environnement.</p>
                ) : null}
              </div>
            )}
          </fieldset>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" disabled={!changed || !valid || pending}>
          {pending ? <Icon icon={Loading03Icon} className="animate-spin" aria-hidden /> : null}
          Enregistrer
        </Button>
      </DialogFooter>
    </form>
  );
}
