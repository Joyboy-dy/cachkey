import type { EnvironmentDto, SecretDto } from "@cachkey/shared";
import {
  Add01Icon,
  Cancel01Icon,
  Clock01Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  Key01Icon,
  Loading03Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Search01Icon,
  Tick02Icon,
  Upload01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { formatDate } from "@/lib/date";
import { environmentsApi, secretsApi, secretsQueryOptions } from "@/lib/secrets";
import { cn } from "@/lib/utils";
import { HistoryDialog, ImportDialog, RevealedValue, SecretFormDialog } from "./secret-dialogs";
import { useCopy } from "./use-copy";

type Dialog =
  | { type: "create" }
  | { type: "edit"; secret: SecretDto }
  | { type: "history"; secret: SecretDto }
  | { type: "delete"; secret: SecretDto }
  | { type: "import" }
  | null;

type Sort = "name" | "recent";

/** Rows rendered at first, then by batches: a 500-variable environment stays fluid. */
const PAGE_SIZE = 50;

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

/** Variables of one environment: masked by default, revealed and copied on demand. */
export function SecretsPanel({
  organizationId,
  projectSlug,
  environment,
  switcher,
}: {
  organizationId: string;
  projectSlug: string;
  environment: EnvironmentDto;
  /** Environment selector, shown first in the toolbar. */
  switcher: ReactNode;
}) {
  const queryClient = useQueryClient();
  const options = secretsQueryOptions(organizationId, projectSlug, environment.slug);
  const { data: secrets } = useSuspenseQuery(options);
  const scope = { slug: projectSlug, env: environment.slug };

  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  /** Values revealed in this view, by `id:version`: a new version is hidden again. */
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  // « / » focuses the search, like on most developer tools.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = query
      ? secrets.filter((secret) => secret.key.toLowerCase().includes(query))
      : [...secrets];
    if (sort === "recent") matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return matches;
  }, [secrets, search, sort]);
  const shown = filtered.slice(0, limit);
  const remaining = filtered.length - shown.length;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: options.queryKey });
    await queryClient.invalidateQueries({
      queryKey: ["environments", organizationId, projectSlug],
    });
  }

  const close = () => setDialog(null);
  const onDialogChange = (open: boolean) => {
    if (!open) close();
  };

  async function reveal(secret: SecretDto): Promise<string | null> {
    const cacheKey = `${secret.id}:${secret.version}`;
    const cached = revealed[cacheKey];
    if (cached !== undefined) return cached;
    const { data, error } = await secretsApi.reveal(scope.slug, scope.env, secret.id);
    if (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      return null;
    }
    setRevealed((current) => ({ ...current, [cacheKey]: data.value }));
    return data.value;
  }

  function hide(secret: SecretDto) {
    setRevealed((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(`${secret.id}:`)),
      ),
    );
  }

  async function exportFile() {
    setExporting(true);
    setFeedback(null);
    const { data, error } = await environmentsApi.export(scope.slug, scope.env);
    setExporting(false);
    if (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      return;
    }
    const url = URL.createObjectURL(new Blob([data.content], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = data.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const empty = secrets.length === 0;
  const revealedCount = Object.keys(revealed).length;

  return (
    <section className="rounded-xl border bg-card" aria-label={`Variables de ${environment.name}`}>
      {/* From tablet width, stays under the top bar while scrolling through long lists. */}
      <div className="z-[5] rounded-t-xl border-b bg-card/95 backdrop-blur-sm sm:sticky sm:top-16">
        <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
          {switcher}
          <div className="relative min-w-0 flex-1 basis-40">
            <Icon
              icon={Search01Icon}
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setLimit(PAGE_SIZE);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && search) {
                  event.preventDefault();
                  setSearch("");
                }
              }}
              placeholder="Rechercher"
              aria-label="Rechercher une variable par son nom"
              aria-keyshortcuts="/"
              disabled={empty}
              className="h-9 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchRef.current?.focus();
                }}
                className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <Icon icon={Cancel01Icon} className="size-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-secondary px-1.5 font-mono text-[11px] leading-4 text-muted-foreground sm:block">
                /
              </kbd>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setDialog({ type: "import" })}
            >
              <Icon icon={Upload01Icon} />
              <span className="sr-only lg:not-sr-only">Importer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void exportFile()}
              disabled={exporting || empty}
            >
              <Icon
                icon={exporting ? Loading03Icon : Download01Icon}
                className={cn(exporting && "animate-spin")}
              />
              <span className="sr-only lg:not-sr-only">Exporter</span>
            </Button>
            <Button size="sm" className="h-9" onClick={() => setDialog({ type: "create" })}>
              <Icon icon={Add01Icon} />
              <span className="sr-only sm:not-sr-only">Ajouter</span>
            </Button>
          </div>
        </div>

        {empty ? null : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-2 text-xs text-muted-foreground sm:px-5">
            <p aria-live="polite">
              {search.trim()
                ? `${plural(filtered.length, "résultat", "résultats")} sur ${secrets.length}`
                : plural(secrets.length, "variable", "variables")}
              {revealedCount ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => setRevealed({})}
                    className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4"
                  >
                    Tout masquer
                  </button>
                </>
              ) : null}
            </p>
            <div role="group" aria-label="Trier" className="flex rounded-md bg-secondary p-0.5">
              {(
                [
                  ["name", "Nom"],
                  ["recent", "Récentes"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={sort === value}
                  onClick={() => setSort(value)}
                  className={cn(
                    "rounded px-2 py-0.5 font-medium transition-colors",
                    sort === value
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {feedback ? <FeedbackAlert feedback={feedback} className="m-4 w-auto sm:m-5" /> : null}

      {empty ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
            <Icon icon={Key01Icon} className="size-5" />
          </span>
          <h3 className="mt-4 text-base font-semibold">
            Aucune variable dans <span className="font-mono">{environment.name}</span>
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-balance text-muted-foreground">
            Importez votre fichier .env en une fois, ou ajoutez les variables une par une.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => setDialog({ type: "create" })}>
              <Icon icon={Add01Icon} />
              Ajouter une variable
            </Button>
            <Button onClick={() => setDialog({ type: "import" })}>
              <Icon icon={Upload01Icon} />
              Importer un .env
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          <p>Aucune variable ne contient « {search.trim()} ».</p>
          <Button variant="link" className="mt-2" onClick={() => setSearch("")}>
            Effacer la recherche
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {shown.map((secret) => (
              <SecretRow
                key={secret.id}
                secret={secret}
                query={search.trim()}
                value={revealed[`${secret.id}:${secret.version}`]}
                onReveal={() => reveal(secret)}
                onHide={() => hide(secret)}
                onEdit={() => setDialog({ type: "edit", secret })}
                onHistory={() => setDialog({ type: "history", secret })}
                onDelete={() => setDialog({ type: "delete", secret })}
              />
            ))}
          </ul>
          {remaining > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-2 border-t px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
              >
                Afficher {Math.min(PAGE_SIZE, remaining)} de plus
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLimit(filtered.length)}>
                Tout afficher ({remaining} restantes)
              </Button>
            </div>
          ) : null}
        </>
      )}

      <SecretFormDialog
        open={dialog?.type === "create" || dialog?.type === "edit"}
        onOpenChange={onDialogChange}
        scope={scope}
        secret={dialog?.type === "edit" ? dialog.secret : undefined}
        environmentName={environment.name}
        onSaved={refresh}
      />
      <HistoryDialog
        open={dialog?.type === "history"}
        onOpenChange={onDialogChange}
        scope={scope}
        secret={dialog?.type === "history" ? dialog.secret : null}
        onRestored={refresh}
      />
      <ImportDialog
        open={dialog?.type === "import"}
        onOpenChange={onDialogChange}
        scope={scope}
        environmentName={environment.name}
        existingKeys={secrets.map((secret) => secret.key)}
        onImported={refresh}
      />
      <ConfirmDialog
        open={dialog?.type === "delete"}
        onOpenChange={onDialogChange}
        title="Supprimer cette variable ?"
        description={
          dialog?.type === "delete" ? (
            <>
              <code className="font-mono break-all text-foreground">{dialog.secret.key}</code> et
              tout son historique seront définitivement supprimés de {environment.name}.
            </>
          ) : null
        }
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (dialog?.type !== "delete") return null;
          const { error } = await secretsApi.remove(scope.slug, scope.env, dialog.secret.id);
          if (error) return getAuthErrorMessage(error);
          await refresh();
          close();
          return null;
        }}
      />
    </section>
  );
}

/** The key with the searched part emphasised. */
function HighlightedKey({ value, query }: { value: string; query: string }) {
  const index = query ? value.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (index < 0) return <>{value}</>;
  return (
    <>
      {value.slice(0, index)}
      <mark className="rounded-sm bg-primary/20 text-foreground">
        {value.slice(index, index + query.length)}
      </mark>
      {value.slice(index + query.length)}
    </>
  );
}

function SecretRow({
  secret,
  query,
  value,
  onReveal,
  onHide,
  onEdit,
  onHistory,
  onDelete,
}: {
  secret: SecretDto;
  query: string;
  value: string | undefined;
  onReveal: () => Promise<string | null>;
  onHide: () => void;
  onEdit: () => void;
  onHistory: () => void;
  onDelete: () => void;
}) {
  const { copied, copy } = useCopy();
  const [loading, setLoading] = useState(false);
  const shown = value !== undefined;

  async function toggle() {
    if (shown) return onHide();
    setLoading(true);
    await onReveal();
    setLoading(false);
  }

  async function copyValue() {
    const current = value ?? (await onReveal());
    if (current !== null) await copy(current);
  }

  return (
    <li className="group grid gap-2 px-4 py-2.5 hover:bg-accent/40 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="grid min-w-0 flex-1 gap-0.5 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-center md:gap-6">
          <div className="min-w-0">
            <code className="block truncate font-mono text-sm font-medium" title={secret.key}>
              <HighlightedKey value={secret.key} query={query} />
            </code>
            <p className="truncate text-xs text-muted-foreground">
              {secret.version > 1 ? `v${secret.version} · ` : ""}
              Modifiée le {formatDate(secret.updatedAt)}
              {secret.updatedBy ? ` par ${secret.updatedBy.name}` : ""}
            </p>
          </div>
          {shown ? null : (
            <button
              type="button"
              onClick={() => void toggle()}
              className="hidden w-fit rounded font-mono text-sm tracking-[0.2em] text-muted-foreground select-none hover:text-foreground md:block"
              aria-label={`Afficher ${secret.key}`}
            >
              ••••••••••••
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => void toggle()}
            disabled={loading}
            aria-label={shown ? `Masquer ${secret.key}` : `Afficher ${secret.key}`}
            aria-pressed={shown}
          >
            <Icon
              icon={loading ? Loading03Icon : shown ? ViewOffSlashIcon : ViewIcon}
              className={cn(loading && "animate-spin")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => void copyValue()}
            aria-label={copied ? "Valeur copiée" : `Copier la valeur de ${secret.key}`}
          >
            <Icon
              icon={copied ? Tick02Icon : Copy01Icon}
              className={copied ? "text-success" : ""}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Actions pour ${secret.key}`}
              >
                <Icon icon={MoreHorizontalIcon} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Icon icon={PencilEdit02Icon} />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onHistory}>
                <Icon icon={Clock01Icon} />
                Historique
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Icon icon={Delete02Icon} />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {value === undefined ? null : <RevealedValue value={value} />}
    </li>
  );
}
