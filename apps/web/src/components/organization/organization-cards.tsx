import {
  canManage,
  type InvitableRole,
  invitableRoles,
  type MemberDto,
  type MemberRole,
  memberRoles,
  organizationSchema,
  type Workspace,
} from "@cachkey/shared";
import { Loading03Icon, UserRemove01Icon } from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ConfirmByTypingDialog,
  ConfirmDialog,
  DangerAction,
  dangerTriggerClass,
} from "@/components/app/confirm";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { UserAvatar } from "@/components/app/user-avatar";
import { useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { formatDate } from "@/lib/date";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { membersQueryOptions, request, useRefreshWorkspace } from "@/lib/workspace";
import { OrgAvatar } from "./org-avatar";

type Organization = NonNullable<Workspace["active"]>;

const cardBody = "grid gap-5 px-5 py-5 sm:px-6";
const actions = "flex justify-end border-t px-5 py-3.5 sm:px-6";

export function OrganizationGeneralCard({ organization }: { organization: Organization }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const refreshWorkspace = useRefreshWorkspace();
  const manager = canManage(organization.role);

  const form = useAppForm({
    defaultValues: { name: organization.name },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: organizationSchema },
    onSubmit: async ({ value, formApi }) => {
      setFeedback(null);
      const name = value.name.trim();
      const { error } = await authClient.organization.update({
        organizationId: organization.id,
        data: { name },
      });
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      formApi.reset({ name });
      await refreshWorkspace();
      setFeedback({ tone: "success", message: "Le nom de l’organisation a été mis à jour." });
    },
  });

  return (
    <SectionCard title="Général" description="L’identité de votre organisation dans Cachkey.">
      <div className="flex items-center gap-4 px-5 pt-5 sm:px-6">
        <OrgAvatar id={organization.id} className="size-14 rounded-xl" />
        <div className="min-w-0">
          <p className="truncate text-base leading-6 font-medium">{organization.name}</p>
          <p className="text-sm leading-5 text-muted-foreground">
            Votre rôle : {ROLE_LABELS[organization.role]}
          </p>
        </div>
      </div>
      {manager ? (
        <form.AppForm>
          <form.Form>
            <div className={cardBody}>
              <FeedbackAlert feedback={feedback} />
              <form.AppField name="name">
                {(field) => (
                  <field.TextField label="Nom de l’organisation" autoComplete="organization" />
                )}
              </form.AppField>
            </div>
            <div className={actions}>
              <form.SubmitButton size="default" className="w-full sm:w-auto" requireChanges>
                Enregistrer
              </form.SubmitButton>
            </div>
          </form.Form>
        </form.AppForm>
      ) : (
        <p className="px-5 py-5 text-sm leading-6 text-muted-foreground sm:px-6">
          Seuls les propriétaires et les administrateurs peuvent modifier l’organisation.
        </p>
      )}
    </SectionCard>
  );
}

/** Who may change `target`: managers act on other non-owner members (ownership is transferred). */
function canActOn(viewer: MemberRole, target: MemberDto, viewerId: string): boolean {
  return target.user.id !== viewerId && canManage(viewer) && target.role !== "owner";
}

type PendingChange =
  | { type: "role"; member: MemberDto; role: InvitableRole }
  | { type: "remove"; member: MemberDto }
  | null;

export function MembersCard({
  organization,
  viewerId,
}: {
  organization: Organization;
  viewerId: string;
}) {
  const queryClient = useQueryClient();
  const { data: members } = useSuspenseQuery(membersQueryOptions(organization.id));
  const [change, setChange] = useState<PendingChange>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  /** Applies the confirmed change; returns an error message for the dialog, if any. */
  async function apply(): Promise<string | null> {
    if (!change) return null;
    const { member } = change;
    const { error } =
      change.type === "role"
        ? await authClient.organization.updateMemberRole({ memberId: member.id, role: change.role })
        : await authClient.organization.removeMember({ memberIdOrEmail: member.id });
    if (error) return getAuthErrorMessage(error);
    await queryClient.invalidateQueries({ queryKey: ["members"] });
    await queryClient.invalidateQueries({ queryKey: ["access"] });
    setFeedback({
      tone: "success",
      message:
        change.type === "role"
          ? `${member.user.name} est maintenant ${ROLE_LABELS[change.role].toLowerCase()}.`
          : `${member.user.name} a été retiré de l’organisation.`,
    });
    setChange(null);
    return null;
  }

  return (
    <SectionCard
      title="Membres"
      description="Les personnes qui ont accès à cette organisation et leur rôle."
      aside={<StatusPill>{members.length}</StatusPill>}
    >
      {feedback ? <FeedbackAlert feedback={feedback} className="mx-5 mt-5 w-auto sm:mx-6" /> : null}
      <ul className="divide-y">
        {members.map((member) => {
          const editable = canActOn(organization.role, member, viewerId);
          return (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:px-6"
            >
              <UserAvatar user={member.user} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm leading-5 font-medium">
                  <span className="truncate">{member.user.name}</span>
                  {member.user.id === viewerId ? <StatusPill>Vous</StatusPill> : null}
                </p>
                <p className="truncate text-sm leading-5 text-muted-foreground">
                  {member.user.email} · depuis le {formatDate(member.joinedAt)}
                </p>
              </div>
              {editable && member.role !== "owner" ? (
                <div className="flex items-center gap-2">
                  {/* The value only changes once the dialog is confirmed. */}
                  <Select
                    value={member.role}
                    onValueChange={(value) => {
                      setFeedback(null);
                      setChange({ type: "role", member, role: value as InvitableRole });
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-40"
                      aria-label={`Rôle de ${member.user.name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {invitableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Retirer ${member.user.name} de l’organisation`}
                    title="Retirer de l’organisation"
                    onClick={() => {
                      setFeedback(null);
                      setChange({ type: "remove", member });
                    }}
                  >
                    <Icon icon={UserRemove01Icon} />
                  </Button>
                </div>
              ) : (
                <StatusPill tone={member.role === "owner" ? "success" : "neutral"}>
                  {ROLE_LABELS[member.role]}
                </StatusPill>
              )}
            </li>
          );
        })}
      </ul>
      <dl className="grid gap-2 border-t px-5 py-4 text-sm sm:px-6">
        {memberRoles.map((role) => (
          <div key={role} className="flex flex-wrap gap-x-2">
            <dt className="font-medium">{ROLE_LABELS[role]}</dt>
            <dd className="text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</dd>
          </div>
        ))}
      </dl>

      <RoleChangeDialog change={change} onCancel={() => setChange(null)} onConfirm={apply} />
    </SectionCard>
  );
}

function RoleChangeDialog({
  change,
  onCancel,
  onConfirm,
}: {
  change: PendingChange;
  onCancel: () => void;
  onConfirm: () => Promise<string | null>;
}) {
  const name = change?.member.user.name ?? "";
  if (change?.type === "remove") {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => {
          if (!open) onCancel();
        }}
        title={`Retirer ${name} ?`}
        description={`${name} perdra immédiatement l’accès à l’organisation et à tous ses projets. Vous pourrez l’inviter à nouveau.`}
        confirmLabel="Retirer de l’organisation"
        onConfirm={onConfirm}
      />
    );
  }
  const role = change?.type === "role" ? change.role : "member";
  const promote = role === "admin";
  return (
    <ConfirmDialog
      open={change?.type === "role"}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={promote ? `Nommer ${name} administrateur ?` : `Repasser ${name} en membre ?`}
      description={
        promote
          ? `${name} pourra gérer les membres, les invitations, tous les projets et leurs accès, et consulter le journal d’activité.`
          : `${name} ne verra plus que les projets qui lui seront partagés. Ses accès actuels devront être redonnés projet par projet.`
      }
      confirmLabel={promote ? "Nommer administrateur" : "Repasser en membre"}
      tone={promote ? "default" : "destructive"}
      onConfirm={onConfirm}
    />
  );
}

/** Leave (non-owners) or delete (owner: type the name, then hold) the organisation. */
export function OrganizationDangerCard({ organization }: { organization: Organization }) {
  const navigate = useNavigate();
  const refreshWorkspace = useRefreshWorkspace();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [leaving, setLeaving] = useState(false);
  const owner = organization.role === "owner";

  async function afterExit() {
    await refreshWorkspace();
    await navigate({ to: "/onboarding", replace: true });
  }

  const [deleting, setDeleting] = useState(false);

  if (!owner) {
    return (
      <SectionCard
        title="Quitter l’organisation"
        description="Vous perdrez l’accès à ses projets. Un administrateur pourra vous ajouter à nouveau."
        className="border-destructive/30"
      >
        <div className="grid gap-4 px-5 py-5 sm:px-6">
          <FeedbackAlert feedback={feedback} />
          <div className="flex justify-end">
            <Button
              variant="destructive"
              disabled={leaving}
              className="w-full sm:w-auto"
              onClick={async () => {
                setLeaving(true);
                setFeedback(null);
                const { error } = await authClient.organization.leave({
                  organizationId: organization.id,
                });
                if (error) {
                  setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
                  setLeaving(false);
                  return;
                }
                await afterExit();
              }}
            >
              {leaving ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
              Quitter {organization.name}
            </Button>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Zone sensible" className="border-destructive/30">
      <TransferOwnership organization={organization} />
      <DangerAction
        title="Supprimer l’organisation"
        description="Tous ses projets, leurs variables et l’accès de ses membres seront définitivement supprimés."
        action={
          <Button
            variant="outline"
            className={dangerTriggerClass}
            onClick={() => setDeleting(true)}
          >
            Supprimer l’organisation
          </Button>
        }
      />
      <ConfirmByTypingDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Supprimer ${organization.name} ?`}
        description="Cette action est définitive et ne peut pas être annulée."
        consequences={[
          "Tous les projets, environnements et variables seront supprimés.",
          "Tous les membres perdront leur accès.",
          "Les applications qui utilisent ces variables ne pourront plus les récupérer.",
        ]}
        expected={organization.name}
        confirmLabel="Supprimer l’organisation"
        hold
        onConfirm={async () => {
          const { error } = await authClient.organization.delete({
            organizationId: organization.id,
          });
          if (error) return getAuthErrorMessage(error);
          await afterExit();
          return null;
        }}
      />
    </SectionCard>
  );
}

/**
 * Hands the organisation over to another member, in three steps: choose the member, type the
 * organisation's name, then hold the button. The current owner becomes administrator.
 */
function TransferOwnership({ organization }: { organization: Organization }) {
  const queryClient = useQueryClient();
  const refreshWorkspace = useRefreshWorkspace();
  const { data: members } = useQuery(membersQueryOptions(organization.id));
  const [step, setStep] = useState<"choose" | "confirm" | null>(null);
  const [userId, setUserId] = useState("");
  const candidates = (members ?? []).filter((member) => member.role !== "owner");
  const target = candidates.find((member) => member.user.id === userId);

  return (
    <div className="border-b">
      <DangerAction
        title="Transférer la propriété"
        description="Un autre membre devient propriétaire ; vous restez dans l’organisation en tant qu’administrateur."
        action={
          <Button
            variant="outline"
            className={dangerTriggerClass}
            disabled={candidates.length === 0}
            title={candidates.length === 0 ? "Invitez d’abord un autre membre." : undefined}
            onClick={() => {
              setUserId("");
              setStep("choose");
            }}
          >
            Transférer la propriété
          </Button>
        }
      />

      <Dialog open={step === "choose"} onOpenChange={(open) => !open && setStep(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transférer la propriété</DialogTitle>
            <DialogDescription>
              Étape 1 sur 2 : choisissez le futur propriétaire de {organization.name}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="transfer-target">Nouveau propriétaire</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="transfer-target" className="w-full">
                  <SelectValue placeholder="Choisir un membre" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((member) => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      {member.user.name} · {member.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ul className="grid gap-1.5 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm leading-5">
              <li>Le nouveau propriétaire pourra supprimer l’organisation ou vous en retirer.</li>
              <li>Vous deviendrez administrateur et ne pourrez plus revenir en arrière seul.</li>
            </ul>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep(null)}>
              Annuler
            </Button>
            <Button variant="destructive" disabled={!target} onClick={() => setStep("confirm")}>
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmByTypingDialog
        open={step === "confirm"}
        onOpenChange={(open) => !open && setStep(null)}
        title={`Transférer ${organization.name} à ${target?.user.name ?? ""} ?`}
        description="Étape 2 sur 2. Cette action prend effet immédiatement."
        consequences={[
          `${target?.user.name ?? ""} devient propriétaire de l’organisation.`,
          "Vous devenez administrateur.",
        ]}
        expected={organization.name}
        confirmLabel="Transférer la propriété"
        hold
        onConfirm={async () => {
          const { error } = await request<{ status: true }>(
            "POST",
            "/api/organization/transfer-ownership",
            { userId, confirmation: organization.name },
          );
          if (error) return getAuthErrorMessage(error);
          setStep(null);
          await queryClient.invalidateQueries({ queryKey: ["members"] });
          await refreshWorkspace();
          return null;
        }}
      />
    </div>
  );
}
