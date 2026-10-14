import { Loading03Icon } from "@hugeicons/core-free-icons";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
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
import { cn } from "@/lib/utils";

/*
 * Confirmation patterns, from the lightest to the strongest:
 * - ConfirmDialog: one explicit click (deleting a variable).
 * - ConfirmByTypingDialog: type a value (deleting a project).
 * - ConfirmByTypingDialog + `hold`: type a value, then press and hold (organisation, account).
 */

/** Returns an error message to display, or null when the action succeeded. */
type ConfirmAction = () => Promise<string | null>;

type DialogState = { open: boolean; onOpenChange: (open: boolean) => void };

function useConfirmAction(onConfirm: ConfirmAction) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function run() {
    setPending(true);
    setFeedback(null);
    const message = await onConfirm();
    setPending(false);
    if (message) setFeedback({ tone: "error", message });
  }

  return { pending, feedback, run, reset: () => setFeedback(null) };
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: DialogState & {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: ConfirmAction;
}) {
  const { pending, feedback, run, reset } = useConfirmAction(onConfirm);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FeedbackAlert feedback={feedback} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={() => void run()} disabled={pending}>
            {pending ? <Icon icon={Loading03Icon} className="animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmByTypingDialog({
  open,
  onOpenChange,
  title,
  description,
  consequences,
  expected,
  confirmLabel,
  hold = false,
  onConfirm,
}: DialogState & {
  title: string;
  description: ReactNode;
  /** What will be lost, listed before the confirmation field. */
  consequences?: string[];
  /** Exact value to type (case-sensitive). */
  expected: string;
  confirmLabel: string;
  /** Strongest level: after typing, the button must be pressed and held. */
  hold?: boolean;
  onConfirm: ConfirmAction;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Remounted on every opening: the typed value never survives a cancel. */}
        {open ? (
          <TypingForm
            consequences={consequences}
            expected={expected}
            confirmLabel={confirmLabel}
            hold={hold}
            onConfirm={onConfirm}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TypingForm({
  consequences,
  expected,
  confirmLabel,
  hold,
  onConfirm,
  onCancel,
}: {
  consequences?: string[];
  expected: string;
  confirmLabel: string;
  hold: boolean;
  onConfirm: ConfirmAction;
  onCancel: () => void;
}) {
  const id = useId();
  const [typed, setTyped] = useState("");
  const { pending, feedback, run } = useConfirmAction(onConfirm);
  const matches = typed.trim() === expected;

  return (
    <form
      noValidate
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        if (matches && !hold && !pending) void run();
      }}
    >
      <DialogBody className="grid gap-4">
        {consequences?.length ? (
          <ul className="grid gap-1.5 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm leading-5">
            {consequences.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-destructive" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        <FeedbackAlert feedback={feedback} />
        <div className="grid gap-2">
          <Label htmlFor={id}>
            Saisissez <span className="font-semibold break-all">{expected}</span> pour confirmer
          </Label>
          <Input
            id={id}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
          />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        {hold ? (
          <HoldToConfirmButton disabled={!matches || pending} pending={pending} onConfirm={run}>
            {confirmLabel}
          </HoldToConfirmButton>
        ) : (
          <Button type="submit" variant="destructive" disabled={!matches || pending}>
            {pending ? <Icon icon={Loading03Icon} className="animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

const HOLD_MS = 1500;

/**
 * Destructive button that only fires after being held down (pointer, Enter or Space) for
 * 1.5 s; releasing earlier cancels. The fill shows progress, so it stays even with reduced
 * motion: it carries information, not decoration.
 */
export function HoldToConfirmButton({
  children,
  disabled,
  pending,
  onConfirm,
}: {
  children: ReactNode;
  disabled?: boolean;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const hintId = useId();
  const [progress, setProgress] = useState(0);
  const frame = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = useRef<number | null>(null);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(timer.current);
    },
    [],
  );

  function begin() {
    if (disabled || start.current !== null) return;
    start.current = performance.now();
    // The timer decides; animation frames only draw the fill.
    timer.current = setTimeout(() => {
      cancelAnimationFrame(frame.current);
      start.current = null;
      setProgress(1);
      void Promise.resolve(onConfirm()).finally(() => setProgress(0));
    }, HOLD_MS);
    const tick = (now: number) => {
      if (start.current === null) return;
      setProgress(Math.min((now - start.current) / HOLD_MS, 1));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  function cancel() {
    if (start.current === null) return;
    cancelAnimationFrame(frame.current);
    clearTimeout(timer.current);
    start.current = null;
    setProgress(0);
  }

  return (
    <div className="grid gap-1.5 sm:justify-items-end">
      <Button
        type="button"
        variant="destructive"
        disabled={disabled}
        aria-describedby={hintId}
        className="relative overflow-hidden select-none"
        onPointerDown={(event) => {
          if (event.button === 0) begin();
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
            event.preventDefault();
            begin();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === "Enter" || event.key === " ") cancel();
        }}
        onBlur={cancel}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-foreground/25"
          style={{ width: `${progress * 100}%` }}
        />
        <span className="relative inline-flex items-center gap-2">
          {pending ? <Icon icon={Loading03Icon} className="animate-spin" aria-hidden /> : null}
          {children}
        </span>
      </Button>
      <p
        id={hintId}
        className={cn(
          "text-center text-xs text-muted-foreground sm:text-right",
          disabled && "opacity-60",
        )}
      >
        Maintenez le bouton enfoncé pour confirmer
      </p>
    </div>
  );
}

/** Row of a « zone sensible » card: what the action does, and the button that starts it. */
export function DangerAction({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <p className="text-sm leading-5 font-medium">{title}</p>
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

/** Opens a destructive flow: outlined, so the filled red stays for the final confirmation. */
export const dangerTriggerClass =
  "w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto";
