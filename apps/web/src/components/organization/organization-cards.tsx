import {
  canManage,
  type MemberDto,
  type MemberRole,
  memberRoles,
  organizationSchema,
  type Workspace,
} from "@cachkey/shared";
import { Loading03Icon, UserRemove01Icon } from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { UserAvatar } from "@/components/app/user-avatar";
import { useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { formatDate } from "@/lib/date";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { membersQueryOptions, useRefreshWorkspace } from "@/lib/workspace";
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
    onSubmit: async ({ value }) => {
      setFeedback(null);
      const { error } = await authClient.organization.update({
        organizationId: organization.id,
        data: { name: value.name.trim() },
      });
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
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
              <form.SubmitButton size="default" className="w-full sm:w-auto">
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

/** Who may change `target`: managers act on others; only owners act on owners. */
function canActOn(viewer: MemberRole, target: MemberDto, viewerId: string): boolean {
  if (target.user.id === viewerId || !canManage(viewer)) return false;
  return target.role !== "owner" || viewer === "owner";
}

export function MembersCard({
  organization,
  viewerId,
}: {
  organization: Organization;
  viewerId: string;
}) {
  const queryClient = useQueryClient();
  const { data: members } = useSuspenseQuery(membersQueryOptions(organization.id));
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function run(memberId: string, action: () => Promise<{ error: unknown }>, done: string) {
    setPending(memberId);
    setFeedback(null);
    const { error } = await action();
    if (error) {
      setFeedback({
        tone: "error",
        message: getAuthErrorMessage(error as { code?: string; status?: number }),
      });
    } else {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      setFeedback({ tone: "success", message: done });
    }
    setPending(null);
  }

  // Owners may appoint other owners; admins assign admin or member.
  const assignable = memberRoles.filter(
    (role) => role !== "owner" || organization.role === "owner",
  );

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
          const busy = pending === member.id;
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
              {editable ? (
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${member.id}`}>
                    Rôle de {member.user.name}
                  </label>
                  <select
                    id={`role-${member.id}`}
                    value={member.role}
                    disabled={pending !== null}
                    onChange={(event) => {
                      const role = event.target.value as MemberRole;
                      void run(
                        member.id,
                        () =>
                          authClient.organization.updateMemberRole({
                            memberId: member.id,
                            role,
                          }),
                        `${member.user.name} est maintenant ${ROLE_LABELS[role].toLowerCase()}.`,
                      );
                    }}
                    className="h-8 rounded-md border border-input bg-card px-2 text-sm hover:border-foreground/55 disabled:opacity-60"
                  >
                    {assignable.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Retirer ${member.user.name} de l’organisation`}
                    title="Retirer de l’organisation"
                    disabled={pending !== null}
                    onClick={() =>
                      void run(
                        member.id,
                        () =>
                          authClient.organization.removeMember({
                            memberIdOrEmail: member.id,
                          }),
                        `${member.user.name} a été retiré de l’organisation.`,
                      )
                    }
                  >
                    <Icon
                      icon={busy ? Loading03Icon : UserRemove01Icon}
                      className={cn(busy && "animate-spin")}
                    />
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
        <p className="mt-1 text-muted-foreground">
          L’invitation de nouveaux membres arrive dans une prochaine version.
        </p>
      </dl>
    </SectionCard>
  );
}

/** Leave (non-owners) or delete (owner, after typing the name) the organisation. */
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

  const schema = z.object({
    confirmation: z
      .string()
      .trim()
      .refine((value) => value === organization.name, {
        message: "Saisissez le nom exact de l’organisation pour confirmer.",
      }),
  });

  const form = useAppForm({
    defaultValues: { confirmation: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: async () => {
      setFeedback(null);
      const { error } = await authClient.organization.delete({ organizationId: organization.id });
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      await afterExit();
    },
  });

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
    <SectionCard
      title="Supprimer l’organisation"
      description="Tous ses projets et l’accès de ses membres seront définitivement supprimés."
      className="border-destructive/30"
    >
      <form.AppForm>
        <form.Form>
          <div className={cardBody}>
            <FeedbackAlert feedback={feedback} />
            <form.AppField name="confirmation">
              {(field) => (
                <field.TextField
                  label={`Saisissez « ${organization.name} » pour confirmer`}
                  autoComplete="off"
                />
              )}
            </form.AppField>
          </div>
          <div className={actions}>
            <form.SubmitButton size="default" variant="destructive" className="w-full sm:w-auto">
              Supprimer l’organisation
            </form.SubmitButton>
          </div>
        </form.Form>
      </form.AppForm>
    </SectionCard>
  );
}
