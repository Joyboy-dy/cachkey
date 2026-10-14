import {
  type InvitableRole,
  invitableRoles,
  invitationSchema,
  type PendingInvitationDto,
  type Workspace,
} from "@cachkey/shared";
import {
  Cancel01Icon,
  Copy01Icon,
  Link01Icon,
  Loading03Icon,
  MailSend01Icon,
  Tick02Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useCopy } from "@/components/secrets/use-copy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
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
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { organizationInvitationsQueryOptions } from "@/lib/collaboration";
import { formatDate } from "@/lib/date";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Organization = NonNullable<Workspace["active"]>;

/**
 * Shareable link of an invitation. Safe to share: opening it requires signing in with the
 * invited address (verified), so the link alone never lets someone else in.
 */
function invitationLink(id: string): string {
  return `${window.location.origin}/invitation/${encodeURIComponent(id)}`;
}

/** Copies an invitation link, with a short « Copié » confirmation. */
function CopyLinkButton({ id, email }: { id: string; email: string }) {
  const { copied, copy } = useCopy();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void copy(invitationLink(id))}
      aria-label={copied ? "Lien copié" : `Copier le lien d’invitation de ${email}`}
    >
      <Icon icon={copied ? Tick02Icon : Link01Icon} className={copied ? "text-success" : ""} />
      <span className="sr-only sm:not-sr-only">{copied ? "Copié" : "Copier le lien"}</span>
    </Button>
  );
}

/** Pending invitations and the « Inviter » action (owners and admins). */
export function InvitationsCard({ organization }: { organization: Organization }) {
  const queryClient = useQueryClient();
  const { data: invitations } = useSuspenseQuery(
    organizationInvitationsQueryOptions(organization.id),
  );
  const [inviting, setInviting] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["invitations", organization.id] });
  }

  async function resend(invitation: PendingInvitationDto) {
    setPending(invitation.id);
    setFeedback(null);
    const { error } = await authClient.organization.inviteMember({
      email: invitation.email,
      role: invitation.role,
      organizationId: organization.id,
      resend: true,
    });
    setPending(null);
    if (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      return;
    }
    await refresh();
    setFeedback({ tone: "success", message: `Invitation renvoyée à ${invitation.email}.` });
  }

  async function cancel(invitation: PendingInvitationDto) {
    setPending(invitation.id);
    setFeedback(null);
    const { error } = await authClient.organization.cancelInvitation({
      invitationId: invitation.id,
    });
    setPending(null);
    if (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      return;
    }
    await refresh();
    setFeedback({ tone: "success", message: `L’invitation de ${invitation.email} est annulée.` });
  }

  return (
    <SectionCard
      title="Invitations"
      description="Invitez des personnes par email. Elles choisissent ensuite d’accepter ou non."
      aside={
        <Button size="sm" onClick={() => setInviting(true)}>
          <Icon icon={UserAdd01Icon} />
          Inviter
        </Button>
      }
    >
      {feedback ? <FeedbackAlert feedback={feedback} className="mx-5 mt-5 w-auto sm:mx-6" /> : null}
      {invitations.length === 0 ? (
        <p className="px-5 py-5 text-sm text-muted-foreground sm:px-6">
          Aucune invitation en attente.
        </p>
      ) : (
        <ul className="divide-y">
          {invitations.map((invitation) => {
            const busy = pending === invitation.id;
            return (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm leading-5 font-medium">
                    <span className="truncate">{invitation.email}</span>
                    <StatusPill>{ROLE_LABELS[invitation.role]}</StatusPill>
                    {invitation.expired ? <StatusPill>Expirée</StatusPill> : null}
                  </p>
                  <p className="truncate text-xs leading-5 text-muted-foreground">
                    Invitée par {invitation.inviterName} le {formatDate(invitation.createdAt)}
                    {invitation.expired ? "" : ` · expire le ${formatDate(invitation.expiresAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {invitation.expired ? null : (
                    <CopyLinkButton id={invitation.id} email={invitation.email} />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending !== null}
                    onClick={() => void resend(invitation)}
                  >
                    <Icon
                      icon={busy ? Loading03Icon : MailSend01Icon}
                      className={cn(busy && "animate-spin")}
                    />
                    <span className="sr-only sm:not-sr-only">Renvoyer</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    disabled={pending !== null}
                    onClick={() => void cancel(invitation)}
                    aria-label={`Annuler l’invitation de ${invitation.email}`}
                  >
                    <Icon icon={Cancel01Icon} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <InviteDialog
        open={inviting}
        onOpenChange={setInviting}
        organization={organization}
        onInvited={refresh}
      />
    </SectionCard>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  organization,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization;
  onInvited: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter dans {organization.name}</DialogTitle>
          <DialogDescription>
            La personne recevra un email pour rejoindre l’organisation.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <InviteForm
            organization={organization}
            onCancel={() => onOpenChange(false)}
            onInvited={onInvited}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({
  organization,
  onCancel,
  onInvited,
}: {
  organization: Organization;
  onCancel: () => void;
  onInvited: () => Promise<void>;
}) {
  const roleGroup = useId();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [created, setCreated] = useState<{ id: string; email: string } | null>(null);
  const form = useAppForm({
    defaultValues: { email: "", role: "member" as InvitableRole },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: invitationSchema },
    onSubmit: async ({ value }) => {
      setFeedback(null);
      const email = value.email.trim().toLowerCase();
      const { data, error } = await authClient.organization.inviteMember({
        email,
        role: value.role,
        organizationId: organization.id,
      });
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      await onInvited();
      setCreated({ id: data.id, email });
    },
  });

  if (created) return <InvitationCreated {...created} onDone={onCancel} />;

  return (
    <form.AppForm>
      <form.Form className="contents">
        <DialogBody className="grid gap-5">
          <FeedbackAlert feedback={feedback} />
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label="Adresse email"
                type="email"
                autoComplete="off"
                placeholder="collegue@exemple.com"
                autoFocus
              />
            )}
          </form.AppField>
          <form.Field name="role">
            {(field) => (
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm leading-none font-medium">Rôle</legend>
                {invitableRoles.map((role) => (
                  <label
                    key={role}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors",
                      field.state.value === role
                        ? "border-primary bg-primary/5"
                        : "hover:border-foreground/30",
                    )}
                  >
                    <input
                      type="radio"
                      name={roleGroup}
                      value={role}
                      checked={field.state.value === role}
                      onChange={() => field.handleChange(role)}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      <span className="block font-medium">{ROLE_LABELS[role]}</span>
                      <span className="block text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
          </form.Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <form.SubmitButton size="default" className="sm:w-auto">
            Envoyer l’invitation
          </form.SubmitButton>
        </DialogFooter>
      </form.Form>
    </form.AppForm>
  );
}

/** Second view of the invite dialog: the link to share, in addition to the email. */
function InvitationCreated({
  id,
  email,
  onDone,
}: {
  id: string;
  email: string;
  onDone: () => void;
}) {
  const inputId = useId();
  const { copied, copy } = useCopy();
  const link = invitationLink(id);

  return (
    <>
      <DialogBody className="grid gap-4">
        <FeedbackAlert feedback={{ tone: "success", message: `Invitation créée pour ${email}.` }} />
        <p className="text-sm leading-6 text-muted-foreground">
          Un email vient de lui être envoyé. Vous pouvez aussi partager ce lien directement, par
          exemple si les emails n’arrivent pas.
        </p>
        <div className="grid gap-2">
          <Label htmlFor={inputId}>Lien d’invitation</Label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={link}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-[13px]"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => void copy(link)}
            >
              <Icon
                icon={copied ? Tick02Icon : Copy01Icon}
                className={copied ? "text-success" : ""}
              />
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Seule la personne qui se connecte avec l’adresse {email} pourra l’accepter. Le lien
            reste valable 7 jours.
          </p>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onDone} autoFocus>
          Terminé
        </Button>
      </DialogFooter>
    </>
  );
}
