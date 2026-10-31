import type { AuditEventDto } from "@cachkey/shared";
import { Key01Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { UserAvatar } from "@/components/app/user-avatar";
import { Icon } from "@/components/ui/icon";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";

/*
 * Turns an audit event into a French sentence. Technical values (actions, roles, levels)
 * are never shown as such: each one is mapped to words.
 */

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[13px] [overflow-wrap:anywhere] text-foreground">
      {children}
    </code>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return <span className="font-medium [overflow-wrap:anywhere] text-foreground">{children}</span>;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

function detail(event: AuditEventDto, key: string): string | number | undefined {
  const value = event.details?.[key];
  return typeof value === "boolean" ? undefined : value;
}

function numberDetail(event: AuditEventDto, key: string): number {
  const value = detail(event, key);
  return typeof value === "number" ? value : 0;
}

/** What happened, after the actor's name. */
export function describeEvent(event: AuditEventDto): ReactNode {
  const target = event.target ?? "";
  const env = event.environmentName ?? "";
  const from = String(detail(event, "from") ?? "");

  switch (event.action) {
    case "secret.revealed":
      return (
        <>
          a affiché la valeur de <Code>{target}</Code>
        </>
      );
    case "secret.version_revealed":
      return (
        <>
          a affiché la version {detail(event, "version")} de <Code>{target}</Code>
        </>
      );
    case "secret.created":
      return (
        <>
          a ajouté la variable <Code>{target}</Code>
        </>
      );
    case "secret.updated":
      return (
        <>
          a modifié la valeur de <Code>{target}</Code>
        </>
      );
    case "secret.renamed":
      return (
        <>
          a renommé <Code>{from}</Code> en <Code>{target}</Code>
        </>
      );
    case "secret.deleted":
      return (
        <>
          a supprimé la variable <Code>{target}</Code>
        </>
      );
    case "secret.restored":
      return (
        <>
          a restauré la version {detail(event, "restored")} de <Code>{target}</Code>
        </>
      );
    case "environment.imported": {
      const parts = [
        numberDetail(event, "created")
          ? plural(numberDetail(event, "created"), "ajoutée", "ajoutées")
          : null,
        numberDetail(event, "updated")
          ? plural(numberDetail(event, "updated"), "remplacée", "remplacées")
          : null,
      ].filter(Boolean);
      return <>a importé un fichier .env ({parts.join(", ")})</>;
    }
    case "environment.exported":
      return (
        <>
          a exporté {plural(numberDetail(event, "variables"), "variable", "variables")} au format
          .env
        </>
      );
    case "environment.pulled":
      return <>a récupéré {plural(numberDetail(event, "variables"), "variable", "variables")}</>;
    case "token.created":
      return (
        <>
          a créé le jeton d’accès <Strong>{target}</Strong>
        </>
      );
    case "token.revoked":
      return (
        <>
          a révoqué le jeton d’accès <Strong>{target}</Strong>
        </>
      );
    case "environment.created":
      return (
        <>
          a créé l’environnement <Code>{env}</Code>
        </>
      );
    case "environment.renamed":
      return (
        <>
          a renommé l’environnement <Code>{from}</Code> en <Code>{env}</Code>
        </>
      );
    case "environment.deleted":
      return (
        <>
          a supprimé l’environnement <Code>{env}</Code> (
          {plural(numberDetail(event, "variables"), "variable", "variables")})
        </>
      );
    case "brick.created":
      return (
        <>
          a ajouté la brique <Strong>{event.brickName ?? ""}</Strong>
        </>
      );
    case "brick.renamed":
      return (
        <>
          a renommé la brique <Strong>{from}</Strong> en <Strong>{event.brickName ?? ""}</Strong>
        </>
      );
    case "brick.deleted":
      return (
        <>
          a supprimé la brique <Strong>{event.brickName ?? ""}</Strong> (
          {plural(numberDetail(event, "variables"), "variable", "variables")})
        </>
      );
    case "project.created":
      return <>a créé le projet</>;
    case "project.updated":
      return from ? (
        <>
          a renommé le projet <Strong>{from}</Strong>
        </>
      ) : (
        <>a modifié la description du projet</>
      );
    case "project.deleted":
      return <>a supprimé le projet</>;
    case "access.granted": {
      const level = detail(event, "level") === "write" ? "en lecture et écriture" : "en lecture";
      const environments = detail(event, "environments");
      const scope =
        typeof environments === "number"
          ? plural(environments, "environnement", "environnements")
          : "tous les environnements";
      return (
        <>
          a donné à <Strong>{target}</Strong> un accès {level} ({scope})
        </>
      );
    }
    case "access.revoked":
      return (
        <>
          a retiré l’accès de <Strong>{target}</Strong>
        </>
      );
    case "member.invited":
      return (
        <>
          a invité <Strong>{target}</Strong> en tant que{" "}
          {roleLabel(String(detail(event, "role") ?? "member")).toLowerCase()}
        </>
      );
    case "member.invitation_canceled":
      return (
        <>
          a annulé l’invitation de <Strong>{target}</Strong>
        </>
      );
    case "member.joined":
      return <>a rejoint l’organisation</>;
    case "member.role_changed":
      return (
        <>
          a nommé <Strong>{target}</Strong>{" "}
          {roleLabel(String(detail(event, "role") ?? "member")).toLowerCase()}
        </>
      );
    case "member.removed":
      return (
        <>
          a retiré <Strong>{target}</Strong> de l’organisation
        </>
      );
    case "member.left":
      return <>a quitté l’organisation</>;
    case "member.ownership_transferred":
      return (
        <>
          a transféré la propriété de l’organisation à <Strong>{target}</Strong>
        </>
      );
  }
}

/** Project, brick and environment of an event (the brick of brick events is in the text). */
export function eventContext(event: AuditEventDto): string {
  const brick = event.action.startsWith("brick.") ? null : event.brickName;
  return [event.projectName, brick, event.environmentName].filter(Boolean).join(" · ");
}

/** Read with a service token. Older events lost `via: "token"` when also sent by the CLI. */
function byToken(event: AuditEventDto): boolean {
  return (
    event.details?.via === "token" || (!event.actor.id && event.actor.name.startsWith("Jeton «"))
  );
}

/** Done from the command-line tool (`via: "cli"` on events recorded before `client`). */
export function fromCli(event: AuditEventDto): boolean {
  return event.details?.client === "cli" || event.details?.via === "cli";
}

/** The actor's avatar, or a key for a service token (no account behind it). */
export function ActorAvatar({ event, className }: { event: AuditEventDto; className?: string }) {
  if (event.actor.id) {
    return (
      <UserAvatar
        user={{ id: event.actor.id, avatarSeed: event.actor.avatarSeed }}
        className={className}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground",
        className,
      )}
    >
      {byToken(event) ? <Icon icon={Key01Icon} className="size-3.5" /> : null}
    </span>
  );
}

const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function AuditEventRow({ event }: { event: AuditEventDto }) {
  const context = eventContext(event);
  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      <ActorAvatar event={event} className="mt-0.5 size-7" />
      <div className="min-w-0 flex-1 text-sm leading-5">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{event.actor.name}</span>{" "}
          {describeEvent(event)}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
          {context ? (
            <>
              <span className="[overflow-wrap:anywhere]">{context}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <time dateTime={event.createdAt}>{time.format(new Date(event.createdAt))}</time>
          {fromCli(event) ? (
            <>
              <span aria-hidden>·</span>
              <span>en ligne de commande</span>
            </>
          ) : null}
          {event.ip ? (
            <>
              <span aria-hidden>·</span>
              <span>depuis {event.ip}</span>
            </>
          ) : null}
        </p>
      </div>
    </li>
  );
}
