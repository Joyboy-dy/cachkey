import {
  type ImportResult,
  parseDotenv,
  type SecretDto,
  type SecretVersionDto,
  secretKeySchema,
  secretValueSchema,
} from "@cachkey/shared";
import {
  ArrowTurnBackwardIcon,
  Copy01Icon,
  Loading03Icon,
  Tick02Icon,
  Upload01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { ShowMore } from "@/components/app/show-more";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { formatDateTime } from "@/lib/date";
import { environmentsApi, type SecretScope, secretsApi } from "@/lib/secrets";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/lib/workspace";
import { useCopy } from "./use-copy";

type DialogState = { open: boolean; onOpenChange: (open: boolean) => void };
type Scope = SecretScope;

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

// ── Create / edit ──────────────────────────────────────────────────────────

/** Create (no `secret`) or edit a variable. Editing loads the current value first. */
export function SecretFormDialog({
  open,
  onOpenChange,
  scope,
  secret,
  environmentName,
  onSaved,
}: DialogState & {
  scope: Scope;
  secret?: SecretDto;
  environmentName: string;
  onSaved: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{secret ? "Modifier la variable" : "Nouvelle variable"}</DialogTitle>
          <DialogDescription>
            {secret
              ? "Changer la valeur crée une nouvelle version ; l’ancienne reste dans l’historique."
              : `Elle sera chiffrée et ajoutée à ${environmentName}.`}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <SecretForm
            scope={scope}
            secret={secret}
            onCancel={() => onOpenChange(false)}
            onSaved={async () => {
              await onSaved();
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SecretForm({
  scope,
  secret,
  onCancel,
  onSaved,
}: {
  scope: Scope;
  secret?: SecretDto;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const keyId = useId();
  const valueId = useId();
  const [key, setKey] = useState(secret?.key ?? "");
  const [value, setValue] = useState("");
  /** Saved value, for edits: the reference to detect real changes. */
  const [saved, setSaved] = useState<string | null>(secret ? null : "");
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!secret) return;
    let cancelled = false;
    void secretsApi.reveal(scope, secret.id).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
        return;
      }
      setValue(data.value);
      setSaved(data.value);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, secret]);

  const loaded = saved !== null;
  const keyResult = secretKeySchema.safeParse(key);
  const valueResult = secretValueSchema.safeParse(value);
  const valid = keyResult.success && valueResult.success;
  const changed = !secret || key.trim() !== secret.key || value !== saved;
  // A name error shows once something was typed, or after a submit attempt.
  const keyError =
    !keyResult.success && (submitted || key !== "") ? keyResult.error.issues[0]?.message : null;
  const valueError = valueResult.success ? null : valueResult.error.issues[0]?.message;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || !changed || !loaded || pending) return;
    setPending(true);
    setFeedback(null);
    const nextKey = key.trim();
    const { error } = secret
      ? await secretsApi.update(scope, secret.id, {
          key: nextKey !== secret.key ? nextKey : undefined,
          value: value !== saved ? value : undefined,
        })
      : await secretsApi.create(scope, { key: nextKey, value });
    if (error) {
      setPending(false);
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      return;
    }
    await onSaved();
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="contents">
      <DialogBody className="grid gap-5">
        <FeedbackAlert feedback={feedback} />
        <div className="grid gap-2">
          <Label htmlFor={keyId}>Nom</Label>
          <Input
            id={keyId}
            value={key}
            // Names cannot contain spaces or dashes: typed as « _ » for convenience.
            onChange={(event) => setKey(event.target.value.replace(/[\s-]/g, "_"))}
            placeholder="DATABASE_URL"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!secret}
            aria-invalid={Boolean(keyError)}
            aria-describedby={keyError ? `${keyId}-error` : undefined}
            className="font-mono"
          />
          {keyError ? (
            <p id={`${keyId}-error`} className="text-[13px] text-destructive">
              {keyError}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={valueId}>Valeur</Label>
          <Textarea
            id={valueId}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={!loaded}
            placeholder={loaded ? "postgres://…" : "Chargement de la valeur…"}
            autoComplete="off"
            spellCheck={false}
            autoFocus={Boolean(secret)}
            rows={4}
            aria-invalid={Boolean(valueError)}
            aria-describedby={valueError ? `${valueId}-error` : undefined}
            className="max-h-[40dvh] font-mono text-[13px] break-all"
          />
          {valueError ? (
            <p id={`${valueId}-error`} className="text-[13px] text-destructive">
              {valueError}
            </p>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending || !loaded || !valid || !changed}>
          {pending ? <Icon icon={Loading03Icon} className="animate-spin" aria-hidden /> : null}
          {secret ? "Enregistrer" : "Ajouter la variable"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── History ────────────────────────────────────────────────────────────────

export function HistoryDialog({
  open,
  onOpenChange,
  scope,
  secret,
  canRestore,
  onRestored,
}: DialogState & {
  scope: Scope;
  secret: SecretDto | null;
  canRestore: boolean;
  onRestored: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Historique</DialogTitle>
          <DialogDescription>
            Toutes les valeurs successives de{" "}
            <code className="font-mono break-all text-foreground">{secret?.key}</code>.
          </DialogDescription>
        </DialogHeader>
        {open && secret ? (
          <HistoryList
            scope={scope}
            secret={secret}
            canRestore={canRestore}
            onRestored={async () => {
              await onRestored();
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HistoryList({
  scope,
  secret,
  canRestore,
  onRestored,
}: {
  scope: Scope;
  secret: SecretDto;
  canRestore: boolean;
  onRestored: () => Promise<void>;
}) {
  const [versions, setVersions] = useState<SecretVersionDto[] | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    let cancelled = false;
    void secretsApi.versions(scope, secret.id).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      else setVersions(data);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, secret.id]);

  return (
    <DialogBody>
      <FeedbackAlert feedback={feedback} className="mb-3" />
      {versions ? (
        <ol className="divide-y">
          {versions.map((version) => (
            <VersionRow
              key={version.version}
              scope={scope}
              secretId={secret.id}
              version={version}
              current={version.version === secret.version}
              canRestore={canRestore}
              onRestored={onRestored}
              onError={(error) =>
                setFeedback({ tone: "error", message: getAuthErrorMessage(error) })
              }
            />
          ))}
        </ol>
      ) : feedback ? null : (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Icon icon={Loading03Icon} className="size-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      )}
    </DialogBody>
  );
}

function VersionRow({
  scope,
  secretId,
  version,
  current,
  canRestore,
  onRestored,
  onError,
}: {
  scope: Scope;
  secretId: string;
  version: SecretVersionDto;
  current: boolean;
  canRestore: boolean;
  onRestored: () => Promise<void>;
  onError: (error: ApiError) => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function toggle() {
    if (value !== null) return setValue(null);
    const { data, error } = await secretsApi.revealVersion(scope, secretId, version.version);
    if (error) onError(error);
    else setValue(data.value);
  }

  async function restore() {
    setRestoring(true);
    const { error } = await secretsApi.restoreVersion(scope, secretId, version.version);
    if (error) {
      setRestoring(false);
      onError(error);
      return;
    }
    await onRestored();
  }

  return (
    <li className="grid gap-2 py-3">
      <div className="flex items-center gap-3">
        {version.createdBy ? (
          <UserAvatar user={version.createdBy} className="size-7" />
        ) : (
          <span className="size-7 shrink-0 rounded-lg bg-secondary" />
        )}
        <div className="min-w-0 flex-1 text-sm leading-5">
          <p className="flex flex-wrap items-center gap-x-2 font-medium">
            Version {version.version}
            {current ? (
              <span className="rounded-full bg-success/10 px-2 text-xs leading-5 font-medium text-success">
                Actuelle
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDateTime(version.createdAt)}
            {version.createdBy ? ` · ${version.createdBy.name}` : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => void toggle()}
          aria-label={value === null ? "Afficher la valeur" : "Masquer la valeur"}
          aria-pressed={value !== null}
        >
          <Icon icon={value === null ? ViewIcon : ViewOffSlashIcon} />
        </Button>
        {current || !canRestore ? null : (
          <Button variant="outline" size="sm" onClick={() => void restore()} disabled={restoring}>
            <Icon
              icon={restoring ? Loading03Icon : ArrowTurnBackwardIcon}
              className={cn(restoring && "animate-spin")}
            />
            <span className="sr-only sm:not-sr-only">Restaurer</span>
          </Button>
        )}
      </div>
      {value === null ? null : <RevealedValue value={value} />}
    </li>
  );
}

/** A revealed value, monospace, clamped when long, with a copy button. */
export function RevealedValue({ value, className }: { value: string; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border bg-secondary/60 py-1.5 pr-1.5 pl-3",
        className,
      )}
    >
      <ShowMore label="Valeur complète" className="min-w-0 flex-1 py-0.5">
        <code className="block font-mono text-[13px] leading-5 break-all whitespace-pre-wrap">
          {value === "" ? <span className="text-muted-foreground italic">(vide)</span> : value}
        </code>
      </ShowMore>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => void copy(value)}
        aria-label={copied ? "Copiée" : "Copier la valeur"}
      >
        <Icon icon={copied ? Tick02Icon : Copy01Icon} className={copied ? "text-success" : ""} />
      </Button>
    </div>
  );
}

// ── Import ─────────────────────────────────────────────────────────────────

export function ImportDialog({
  open,
  onOpenChange,
  scope,
  environmentName,
  existingKeys,
  onImported,
}: DialogState & {
  scope: Scope;
  environmentName: string;
  existingKeys: string[];
  onImported: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des variables</DialogTitle>
          <DialogDescription>
            Depuis un fichier (.env, .env.local, .env.example…) ou en collant son contenu. Les
            valeurs sont chiffrées et ajoutées à {environmentName}.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ImportForm
            scope={scope}
            existingKeys={existingKeys}
            onImported={onImported}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const MAX_IMPORT_BYTES = 1_000_000;

function ImportForm({
  scope,
  existingKeys,
  onImported,
  onClose,
}: {
  scope: Scope;
  existingKeys: string[];
  onImported: () => Promise<void>;
  onClose: () => void;
}) {
  const contentId = useId();
  const overwriteId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Live preview, computed locally: nothing is sent before « Importer ».
  const preview = useMemo(() => {
    if (content.trim() === "") return null;
    const { entries, invalidLines } = parseDotenv(content);
    const existing = new Set(existingKeys);
    const conflicts = entries.filter((entry) => existing.has(entry.key)).length;
    return { total: entries.length, conflicts, created: entries.length - conflicts, invalidLines };
  }, [content, existingKeys]);

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFeedback(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setFeedback({ tone: "error", message: "Ce fichier est trop volumineux (1 Mo au plus)." });
      return;
    }
    const text = await file.text();
    // A binary file (image, archive…) contains NUL characters; a .env never does.
    if (text.includes("\u0000")) {
      setFeedback({ tone: "error", message: "Ce fichier n’est pas un fichier texte .env." });
      return;
    }
    setContent(text);
    setFileName(file.name);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!preview || preview.total === 0 || pending) return;
    setPending(true);
    setFeedback(null);
    const { data, error } = await environmentsApi.import(scope, {
      content,
      overwrite,
    });
    setPending(false);
    if (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
      return;
    }
    setResult(data);
    await onImported();
  }

  if (result) {
    return (
      <ImportSummary
        result={result}
        onAgain={() => {
          setResult(null);
          setContent("");
          setFileName(null);
          setOverwrite(false);
        }}
        onClose={onClose}
      />
    );
  }

  const canImport = preview !== null && preview.total > 0 && !pending;

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="contents">
      <DialogBody className="grid gap-4">
        <FeedbackAlert feedback={feedback} />
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <Label htmlFor={contentId}>Contenu</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-2"
              onClick={() => fileInput.current?.click()}
            >
              <Icon icon={Upload01Icon} />
              {fileName ? "Choisir un autre fichier" : "Choisir un fichier"}
            </Button>
            {/* No `accept`: browsers judge by the last extension and would hide .env.example. */}
            <input
              ref={fileInput}
              type="file"
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
          {fileName ? (
            <p className="truncate text-xs text-muted-foreground">
              Fichier : <span className="font-mono text-foreground">{fileName}</span>
            </p>
          ) : null}
          <Textarea
            id={contentId}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setFileName(null);
            }}
            placeholder={"DATABASE_URL=postgres://…\nAPI_KEY=…"}
            spellCheck={false}
            autoComplete="off"
            rows={8}
            className="[field-sizing:fixed] h-[min(40dvh,18rem)] min-h-32 resize-y font-mono text-[13px]"
          />
        </div>

        <div aria-live="polite" className="min-h-5 text-sm leading-5">
          {preview === null ? null : preview.total === 0 ? (
            <p className="text-destructive">Aucune variable reconnue dans ce contenu.</p>
          ) : (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {plural(preview.total, "variable détectée", "variables détectées")}
              </span>
              {` : ${plural(preview.created, "nouvelle", "nouvelles")}`}
              {preview.conflicts
                ? `, ${plural(preview.conflicts, "existe déjà", "existent déjà")}`
                : ""}
              {preview.invalidLines.length
                ? ` · ${plural(preview.invalidLines.length, "ligne illisible ignorée", "lignes illisibles ignorées")}`
                : ""}
              .
            </p>
          )}
        </div>

        {preview && preview.conflicts > 0 ? (
          <div className="flex items-start gap-3">
            <Checkbox
              id={overwriteId}
              checked={overwrite}
              onCheckedChange={(checked) => setOverwrite(checked === true)}
              aria-describedby={`${overwriteId}-description`}
              className="mt-0.5"
            />
            <div className="grid gap-0.5 text-sm leading-5">
              <Label htmlFor={overwriteId} className="cursor-pointer leading-5">
                Remplacer{" "}
                {preview.conflicts > 1 ? "les variables existantes" : "la variable existante"}
              </Label>
              <p id={`${overwriteId}-description`} className="text-muted-foreground">
                L’ancienne valeur reste dans l’historique. Sinon, elle est conservée telle quelle.
              </p>
            </div>
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" disabled={!canImport}>
          {pending ? <Icon icon={Loading03Icon} className="animate-spin" aria-hidden /> : null}
          {preview && preview.total > 0
            ? `Importer ${plural(preview.total, "variable", "variables")}`
            : "Importer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ImportSummary({
  result,
  onAgain,
  onClose,
}: {
  result: ImportResult;
  onAgain: () => void;
  onClose: () => void;
}) {
  const parts = [
    result.created ? plural(result.created, "ajoutée", "ajoutées") : null,
    result.updated ? plural(result.updated, "remplacée", "remplacées") : null,
    result.unchanged ? plural(result.unchanged, "déjà à jour", "déjà à jour") : null,
    result.skipped ? plural(result.skipped, "conservée", "conservées") : null,
  ].filter(Boolean);

  return (
    <>
      <DialogBody className="grid gap-4">
        <FeedbackAlert
          feedback={{
            tone: "success",
            message: parts.length ? `Import terminé : ${parts.join(", ")}.` : "Rien à importer.",
          }}
        />
        {result.invalidLines.length ? (
          <p className="text-sm text-muted-foreground">
            {result.invalidLines.length > 1 ? "Lignes ignorées" : "Ligne ignorée"} :{" "}
            {result.invalidLines.slice(0, 20).join(", ")}
            {result.invalidLines.length > 20 ? "…" : ""}
          </p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onAgain}>
          Importer autre chose
        </Button>
        <Button onClick={onClose} autoFocus>
          Terminé
        </Button>
      </DialogFooter>
    </>
  );
}
