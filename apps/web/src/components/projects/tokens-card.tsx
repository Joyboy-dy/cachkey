import {
  type BrickDto,
  type EnvironmentDto,
  serviceTokenSchema,
  type ServiceTokenDto,
  type TokenLifetime,
} from "@cachkey/shared";
import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  Key01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { z } from "zod";
import { ConfirmDialog } from "@/components/app/confirm";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { useAppForm } from "@/components/form/form";
import { useCopy } from "@/components/secrets/use-copy";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { serviceTokensQueryOptions, tokensApi } from "@/lib/collaboration";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { textLinkVariants } from "@/components/ui/text-link";

/*
 * Service tokens of a project: read-only access to one environment (and, for projects split
 * into bricks, one brick with the shared variables) for a server, a CI job or the
 * command-line tool. The token is shown once, right after creation.
 */

const LIFETIMES: { value: string; days: TokenLifetime; label: string }[] = [
  { value: "30", days: 30, label: "30 jours" },
  { value: "90", days: 90, label: "90 jours" },
  { value: "365", days: 365, label: "1 an" },
  { value: "never", days: null, label: "Jamais (déconseillé)" },
];

const formSchema = z.object({
  name: serviceTokenSchema.shape.name,
  environmentId: serviceTokenSchema.shape.environmentId,
  brickId: z.string(),
  lifetime: z.enum(["30", "90", "365", "never"]),
});

function isExpired(token: ServiceTokenDto): boolean {
  return token.expiresAt !== null && new Date(token.expiresAt) <= new Date();
}

function usage(token: ServiceTokenDto): string {
  const parts = [
    token.lastUsedAt ? `Utilisé le ${formatDate(token.lastUsedAt)}` : "Jamais utilisé",
  ];
  if (token.expiresAt) {
    parts.push(`${isExpired(token) ? "a expiré" : "expire"} le ${formatDate(token.expiresAt)}`);
  } else {
    parts.push("n’expire pas");
  }
  return parts.join(" · ");
}

export function TokensCard({
  organizationId,
  projectSlug,
  environments,
  bricks,
}: {
  organizationId: string;
  projectSlug: string;
  environments: EnvironmentDto[];
  /** Bricks of the project: the choice only appears from the second one. */
  bricks: BrickDto[];
}) {
  const queryClient = useQueryClient();
  const options = serviceTokensQueryOptions(organizationId, projectSlug);
  const { data: tokens } = useSuspenseQuery(options);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ServiceTokenDto | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: options.queryKey });
  }

  return (
    <div id="jetons" className="scroll-mt-24">
      <SectionCard
        title="Jetons d’accès"
        description="Permettent à un serveur, à une intégration continue ou à l’outil en ligne de commande de lire les variables d’un environnement, sans pouvoir les modifier."
        aside={
          <Button
            variant="outline"
            size="sm"
            disabled={environments.length === 0}
            onClick={() => {
              setFeedback(null);
              setCreating(true);
            }}
          >
            <Icon icon={Add01Icon} />
            <span className="sr-only sm:not-sr-only">Nouveau jeton</span>
          </Button>
        }
      >
        {feedback ? (
          <FeedbackAlert feedback={feedback} className="mx-5 mt-5 w-auto sm:mx-6" />
        ) : null}
        {tokens.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">
            Aucun jeton pour l’instant.
          </p>
        ) : (
          <ul className="divide-y">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <Icon icon={Key01Icon} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm leading-5 font-medium">
                    <span className="truncate">{token.name}</span>
                    {bricks.length > 1 ? <StatusPill>{token.brick.name}</StatusPill> : null}
                    <StatusPill>{token.environment.name}</StatusPill>
                    {isExpired(token) ? <StatusPill>Expiré</StatusPill> : null}
                  </p>
                  <p className="truncate text-xs leading-5 text-muted-foreground">
                    <code className="font-mono">{token.prefix}…</code> · {usage(token)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setFeedback(null);
                    setRevoking(token);
                  }}
                  aria-label={`Révoquer le jeton ${token.name}`}
                  title="Révoquer"
                >
                  <Icon icon={Delete02Icon} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          {creating ? (
            <CreateToken
              projectSlug={projectSlug}
              environments={environments}
              bricks={bricks}
              onCreated={refresh}
              onDone={() => setCreating(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) setRevoking(null);
        }}
        title={`Révoquer ${revoking?.name ?? ""} ?`}
        description="Ce jeton cessera immédiatement de fonctionner. Les serveurs et scripts qui l’utilisent ne pourront plus lire les variables."
        confirmLabel="Révoquer le jeton"
        onConfirm={async () => {
          if (!revoking) return null;
          const { error } = await tokensApi.revoke(projectSlug, revoking.id);
          if (error) return getAuthErrorMessage(error);
          await refresh();
          setFeedback({ tone: "success", message: `Le jeton ${revoking.name} a été révoqué.` });
          setRevoking(null);
          return null;
        }}
      />
    </div>
  );
}

function CreateToken({
  projectSlug,
  environments,
  bricks,
  onCreated,
  onDone,
}: {
  projectSlug: string;
  environments: EnvironmentDto[];
  bricks: BrickDto[];
  onCreated: () => Promise<void>;
  onDone: () => void;
}) {
  const environmentLabel = useId();
  const brickLabel = useId();
  const chooseBrick = bricks.length > 1;
  const lifetimeLabel = useId();
  const [feedback, setFeedback] = useState<Feedback>(null);
  // Kept in component state only: the full token is never cached nor shown again.
  const [created, setCreated] = useState<{ token: string; name: string } | null>(null);
  const form = useAppForm({
    defaultValues: {
      name: "",
      environmentId: environments.at(-1)?.id ?? "",
      brickId: bricks.find((brick) => brick.main)?.id ?? "",
      lifetime: "90" as "30" | "90" | "365" | "never",
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      setFeedback(null);
      // `?? 90` would turn « never » (null) into 90 days: look the choice up explicitly.
      const choice = LIFETIMES.find((lifetime) => lifetime.value === value.lifetime);
      if (!choice) return;
      const days = choice.days;
      const { data, error } = await tokensApi.create(projectSlug, {
        name: value.name.trim(),
        environmentId: value.environmentId,
        ...(chooseBrick && value.brickId ? { brickId: value.brickId } : {}),
        expiresInDays: days,
      });
      if (error || !data) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      await onCreated();
      setCreated({ token: data.token, name: data.serviceToken.name });
    },
  });

  if (created) return <TokenCreated {...created} onDone={onDone} />;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nouveau jeton d’accès</DialogTitle>
        <DialogDescription>
          {chooseBrick
            ? "Le jeton donne accès en lecture seule aux variables d’une brique (avec les variables partagées), dans un seul environnement."
            : "Le jeton donne accès en lecture seule aux variables d’un seul environnement."}
        </DialogDescription>
      </DialogHeader>
      <form.AppForm>
        <form.Form className="grid gap-5">
          <FeedbackAlert feedback={feedback} />
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Nom"
                placeholder="Serveur de production"
                autoComplete="off"
                autoFocus
              />
            )}
          </form.AppField>
          {chooseBrick ? (
            <form.AppField name="brickId">
              {(field) => (
                <div className="grid gap-2">
                  <Label id={brickLabel}>Brique</Label>
                  <Select value={field.state.value} onValueChange={field.handleChange}>
                    <SelectTrigger aria-labelledby={brickLabel} className="w-full">
                      <SelectValue placeholder="Choisir une brique" />
                    </SelectTrigger>
                    <SelectContent>
                      {bricks.map((brick) => (
                        <SelectItem key={brick.id} value={brick.id}>
                          {brick.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.AppField>
          ) : null}
          <form.AppField name="environmentId">
            {(field) => (
              <div className="grid gap-2">
                <Label id={environmentLabel}>Environnement</Label>
                <Select value={field.state.value} onValueChange={field.handleChange}>
                  <SelectTrigger aria-labelledby={environmentLabel} className="w-full">
                    <SelectValue placeholder="Choisir un environnement" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((environment) => (
                      <SelectItem key={environment.id} value={environment.id}>
                        {environment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.AppField>
          <form.AppField name="lifetime">
            {(field) => (
              <div className="grid gap-2">
                <Label id={lifetimeLabel}>Expiration</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as typeof field.state.value)}
                >
                  <SelectTrigger aria-labelledby={lifetimeLabel} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFETIMES.map((lifetime) => (
                      <SelectItem key={lifetime.value} value={lifetime.value}>
                        {lifetime.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  Un jeton qui expire limite les dégâts s’il est un jour divulgué.
                </p>
              </div>
            )}
          </form.AppField>
          <form.SubmitButton>Créer le jeton</form.SubmitButton>
        </form.Form>
      </form.AppForm>
    </>
  );
}

/** Second view: the token, shown once, with how to use it. */
function TokenCreated({
  token,
  name,
  onDone,
}: {
  token: string;
  name: string;
  onDone: () => void;
}) {
  const inputId = useId();
  const { copied, copy } = useCopy();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  // `export` does not exist in PowerShell: one example per shell family.
  const examples = [
    {
      label: "macOS, Linux, Git Bash",
      code: [
        `export CACHKEY_URL=${origin}`,
        "export CACHKEY_TOKEN=<le jeton ci-dessus>",
        "cachkey run -- npm start",
      ].join("\n"),
    },
    {
      label: "Windows PowerShell",
      code: [
        `$env:CACHKEY_URL="${origin}"`,
        '$env:CACHKEY_TOKEN="<le jeton ci-dessus>"',
        "cachkey run -- npm start",
      ].join("\n"),
    },
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Jeton créé</DialogTitle>
        <DialogDescription>{name}</DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-4">
        <FeedbackAlert
          feedback={{
            tone: "success",
            message: "Copiez-le maintenant : il ne sera plus jamais affiché.",
          }}
        />
        <div className="grid gap-2">
          <Label htmlFor={inputId}>Jeton</Label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={token}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-[13px]"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => void copy(token)}
            >
              <Icon
                icon={copied ? Tick02Icon : Copy01Icon}
                className={copied ? "text-success" : ""}
              />
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Rangez-le comme un mot de passe, par exemple dans les secrets de votre intégration
            continue. Si vous le perdez, révoquez-le et créez-en un autre.
          </p>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Exemple avec l’outil en ligne de commande</p>
          {examples.map((example) => (
            <div key={example.label} className="grid gap-1">
              <p className="text-xs text-muted-foreground">{example.label}</p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/50 px-3 py-2.5 font-mono text-xs leading-5">
                {example.code}
              </pre>
            </div>
          ))}
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className={cn(textLinkVariants(), "w-fit text-sm")}
          >
            Documentation de l’API
          </a>
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
