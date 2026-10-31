import { confirmPasswordSchema, verifyTotpSchema } from "@cachkey/shared";
import {
  Copy01Icon,
  Download04Icon,
  SecurityCheckIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { revalidateLogic } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { encode } from "uqr";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard, StatusPill } from "@/components/app/page";
import { useAppForm } from "@/components/form/form";
import { useCopy } from "@/components/secrets/use-copy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { accountsQueryOptions } from "@/lib/auth/account";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { useRefreshSession } from "@/lib/auth/session";

/*
 * Two-factor authentication (Better Auth twoFactor plugin): authenticator app + backup
 * codes. It protects the email + password sign-in, so it needs a password on the account.
 * Enabling: password → scan the QR code → first code → backup codes (shown once).
 */

type Dialogs = "enable" | "disable" | "backup-codes" | null;

export function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const { data: accounts, isPending } = useQuery(accountsQueryOptions());
  const refreshSession = useRefreshSession();
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const hasPassword = accounts?.some((account) => account.providerId === "credential");

  async function closeDialog(message?: string) {
    setDialog(null);
    if (message) {
      setFeedback({ tone: "success", message });
      // `twoFactorEnabled` is read from the session.
      await refreshSession();
    }
  }

  return (
    <SectionCard
      title="Double authentification"
      description="À la connexion par email et mot de passe, un code de votre téléphone est aussi demandé. Un mot de passe volé ne suffit plus."
      aside={enabled ? <StatusPill tone="success">Activée</StatusPill> : null}
    >
      {isPending || !accounts ? (
        <div className="grid gap-3 px-5 py-5 sm:px-6" aria-hidden>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 px-5 py-5 sm:px-6">
          <FeedbackAlert feedback={feedback} />
          {/* Actions under the text until there is room for both on one line. */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
              <Icon icon={SecurityCheckIcon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1 basis-52 text-sm leading-5">
              <p className="font-medium">Application d’authentification</p>
              <p className="text-muted-foreground">
                {enabled
                  ? "Codes de secours disponibles si vous perdez votre téléphone."
                  : hasPassword
                    ? "Google Authenticator, 1Password, Aegis, Bitwarden…"
                    : "Ajoutez d’abord un mot de passe : la double authentification protège la connexion par email."}
              </p>
            </div>
            {enabled ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialog("backup-codes")}>
                  Nouveaux codes de secours
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDialog("disable")}>
                  Désactiver
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setFeedback(null);
                  setDialog("enable");
                }}
                disabled={!hasPassword}
              >
                Activer
              </Button>
            )}
          </div>
        </div>
      )}

      <EnableDialog
        open={dialog === "enable"}
        onClose={(done) => void closeDialog(done ? "Double authentification activée." : undefined)}
      />
      <DisableDialog
        open={dialog === "disable"}
        onClose={(done) =>
          void closeDialog(done ? "Double authentification désactivée." : undefined)
        }
      />
      <BackupCodesDialog open={dialog === "backup-codes"} onClose={() => void closeDialog()} />
    </SectionCard>
  );
}

// ── Enabling ────────────────────────────────────────────────────────────────

type EnableStep =
  | { name: "password" }
  | { name: "scan"; totpURI: string; backupCodes: string[] }
  | { name: "codes"; backupCodes: string[] };

function EnableDialog({ open, onClose }: { open: boolean; onClose: (done: boolean) => void }) {
  const [step, setStep] = useState<EnableStep>({ name: "password" });
  const done = step.name === "codes";

  function handleOpenChange(next: boolean) {
    if (next) return;
    onClose(done);
    setStep({ name: "password" });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {step.name === "password" ? (
          <>
            <DialogHeader>
              <DialogTitle>Activer la double authentification</DialogTitle>
              <DialogDescription>Confirmez d’abord votre mot de passe.</DialogDescription>
            </DialogHeader>
            <PasswordForm
              submitLabel="Continuer"
              onSubmit={async (password) => {
                const { data, error } = await authClient.twoFactor.enable({ password });
                if (error || !data || !("totpURI" in data) || !data.totpURI) {
                  return getAuthErrorMessage(error);
                }
                setStep({ name: "scan", totpURI: data.totpURI, backupCodes: data.backupCodes });
                return null;
              }}
            />
          </>
        ) : step.name === "scan" ? (
          <>
            <DialogHeader>
              <DialogTitle>Scannez le QR code</DialogTitle>
              <DialogDescription>
                Avec votre application d’authentification, puis saisissez le code qu’elle affiche.
              </DialogDescription>
            </DialogHeader>
            <TotpSetup uri={step.totpURI} />
            <VerifyForm
              onSubmit={async (code) => {
                const { error } = await authClient.twoFactor.verifyTotp({ code });
                if (error) return getAuthErrorMessage(error);
                setStep({ name: "codes", backupCodes: step.backupCodes });
                return null;
              }}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Enregistrez vos codes de secours</DialogTitle>
              <DialogDescription>
                Si vous perdez votre téléphone, chaque code permet une connexion. Ils ne seront plus
                affichés : gardez-les dans votre gestionnaire de mots de passe.
              </DialogDescription>
            </DialogHeader>
            <BackupCodesList codes={step.backupCodes} />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>J’ai enregistré mes codes</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * QR code of the otpauth:// address, the name the app will list the account under (it
 * tells a development instance apart, see the API's `twoFactorIssuer`) and the secret for
 * manual entry.
 */
function TotpSetup({ uri }: { uri: string }) {
  const { copied, copy } = useCopy();
  const { secret, issuer } = useMemo(() => {
    const params = new URL(uri).searchParams;
    return { secret: params.get("secret") ?? "", issuer: params.get("issuer") ?? "Cachkey" };
  }, [uri]);
  const grouped = secret.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="grid gap-4">
      <div className="grid justify-items-center gap-2.5">
        <QrCode value={uri} />
        <p className="text-center text-xs text-muted-foreground">
          Le compte apparaîtra sous{" "}
          <span className="font-medium text-foreground">« {issuer} »</span>
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border bg-background py-2 pr-1.5 pl-3.5">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="text-xs text-muted-foreground">Pas de caméra ? Saisissez cette clé</p>
          {/* Wraps between groups of 4, never inside one. */}
          <code className="font-mono text-sm">{grouped}</code>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => void copy(secret)}
          aria-label={copied ? "Clé copiée" : "Copier la clé"}
        >
          <Icon icon={copied ? Tick02Icon : Copy01Icon} />
        </Button>
      </div>
    </div>
  );
}

/** Always dark on light, whatever the theme: authenticator apps scan that reliably. */
function QrCode({ value }: { value: string }) {
  const { path, size } = useMemo(() => {
    const { data, size } = encode(value, { ecc: "M", border: 2 });
    const path = data
      .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")))
      .join("");
    return { path, size };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR code à scanner avec votre application d’authentification"
      className="size-44 rounded-lg bg-[var(--cachkey-warm-white)]"
      shapeRendering="crispEdges"
    >
      <path d={path} fill="var(--cachkey-ink)" />
    </svg>
  );
}

// ── Disabling and new backup codes ──────────────────────────────────────────

function DisableDialog({ open, onClose }: { open: boolean; onClose: (done: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Désactiver la double authentification ?</DialogTitle>
          <DialogDescription>
            Votre mot de passe suffira de nouveau pour vous connecter, et vos codes de secours ne
            fonctionneront plus.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <PasswordForm
            submitLabel="Désactiver"
            variant="destructive"
            onSubmit={async (password) => {
              const { error } = await authClient.twoFactor.disable({ password });
              if (error) return getAuthErrorMessage(error);
              onClose(true);
              return null;
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BackupCodesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [codes, setCodes] = useState<string[] | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) return;
    onClose();
    setCodes(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {codes ? "Vos nouveaux codes de secours" : "Nouveaux codes de secours"}
          </DialogTitle>
          <DialogDescription>
            {codes
              ? "Les anciens codes ne fonctionnent plus. Ceux-ci ne seront plus affichés : gardez-les en lieu sûr."
              : "Les codes actuels cesseront de fonctionner. Confirmez votre mot de passe."}
          </DialogDescription>
        </DialogHeader>
        {codes ? (
          <>
            <BackupCodesList codes={codes} />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>J’ai enregistré mes codes</Button>
            </DialogFooter>
          </>
        ) : open ? (
          <PasswordForm
            submitLabel="Créer de nouveaux codes"
            onSubmit={async (password) => {
              const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
              if (error || !data) return getAuthErrorMessage(error);
              setCodes(data.backupCodes);
              return null;
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ── Shared pieces ───────────────────────────────────────────────────────────

function BackupCodesList({ codes }: { codes: string[] }) {
  const { copied, copy } = useCopy();
  const text = codes.join("\n");

  function download() {
    const blob = new Blob([`Codes de secours Cachkey (${window.location.host})\n\n${text}\n`], {
      type: "text/plain;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "cachkey-codes-de-secours.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="grid gap-3">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border bg-background px-4 py-3 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="text-center">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" size="sm" onClick={() => void copy(text)}>
          <Icon icon={copied ? Tick02Icon : Copy01Icon} />
          {copied ? "Codes copiés" : "Copier"}
        </Button>
        <Button variant="outline" size="sm" onClick={download}>
          <Icon icon={Download04Icon} />
          Télécharger
        </Button>
      </div>
    </div>
  );
}

/** Returns an error message to show, or null when the action succeeded. */
type Submit<T> = (value: T) => Promise<string | null>;

function PasswordForm({
  submitLabel,
  variant = "default",
  onSubmit,
}: {
  submitLabel: string;
  variant?: "default" | "destructive";
  onSubmit: Submit<string>;
}) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useAppForm({
    defaultValues: { password: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: confirmPasswordSchema },
    onSubmit: async ({ value }) => {
      setFeedback(null);
      const message = await onSubmit(value.password);
      if (message) setFeedback({ tone: "error", message });
    },
  });

  return (
    <form.AppForm>
      <form.Form className="grid gap-5">
        <FeedbackAlert feedback={feedback} />
        <form.AppField name="password">
          {(field) => (
            <field.PasswordField label="Mot de passe" autoComplete="current-password" autoFocus />
          )}
        </form.AppField>
        <form.SubmitButton size="default" variant={variant}>
          {submitLabel}
        </form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}

function VerifyForm({ onSubmit }: { onSubmit: Submit<string> }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useAppForm({
    defaultValues: { code: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: verifyTotpSchema },
    onSubmit: async ({ value, formApi }) => {
      setFeedback(null);
      const message = await onSubmit(verifyTotpSchema.parse(value).code);
      if (!message) return;
      setFeedback({ tone: "error", message });
      // Empty slots, focus kept: the next code can be typed right away.
      formApi.reset();
    },
  });

  return (
    <form.AppForm>
      <form.Form className="grid gap-5">
        <FeedbackAlert feedback={feedback} />
        <form.AppField name="code">
          {(field) => (
            <field.CodeField label="Code affiché par l’application" autoFocus submitOnComplete />
          )}
        </form.AppField>
        <form.SubmitButton size="default">Activer</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
