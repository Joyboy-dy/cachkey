import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { Loading03Icon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { type ReactNode, useId, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Application form kit built on TanStack Form's composition API.
 * Fields read their state from context, so pages only declare names and labels.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

function errorMessages(errors: ReadonlyArray<unknown>): string[] {
  return errors
    .map((error) => {
      if (typeof error === "string") return error;
      if (error && typeof error === "object" && "message" in error) {
        return typeof error.message === "string" ? error.message : undefined;
      }
      return undefined;
    })
    .filter((message): message is string => Boolean(message));
}

type FieldShellProps = {
  id: string;
  label: string;
  /**
   * Optional element shown to the right of the label (e.g. a "forgot password" link).
   * It is rendered after the control in the DOM so keyboard users reach the field first.
   */
  labelAside?: ReactNode;
  description?: string;
  errors: string[];
  children: ReactNode;
};

function FieldShell({ id, label, labelAside, description, errors, children }: FieldShellProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2">
      <Label htmlFor={id} className="col-start-1 row-start-1">
        {label}
      </Label>
      <div className="col-span-2 row-start-2">{children}</div>
      {description && errors.length === 0 ? (
        <p id={`${id}-description`} className="col-span-2 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {errors.length > 0 ? (
        <p id={`${id}-error`} className="col-span-2 text-[13px] text-destructive">
          {errors[0]}
        </p>
      ) : null}
      {labelAside ? <div className="col-start-2 row-start-1">{labelAside}</div> : null}
    </div>
  );
}

/** Error first (it replaces the description), otherwise the description, if any. */
function describedBy(id: string, invalid: boolean, description?: string): string | undefined {
  if (invalid) return `${id}-error`;
  return description ? `${id}-description` : undefined;
}

type TextFieldProps = {
  label: string;
  type?: "text" | "email";
  autoComplete?: string;
  placeholder?: string;
  description?: string;
  autoFocus?: boolean;
};

function TextField({ label, type = "text", ...inputProps }: TextFieldProps) {
  const field = useFieldContext<string>();
  const id = useId();
  const errors = errorMessages(field.state.meta.errors);
  const invalid = errors.length > 0;

  return (
    <FieldShell id={id} label={label} description={inputProps.description} errors={errors}>
      <Input
        id={id}
        name={field.name}
        type={type}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={invalid}
        aria-required
        aria-describedby={describedBy(id, invalid, inputProps.description)}
        autoComplete={inputProps.autoComplete}
        placeholder={inputProps.placeholder}
        autoFocus={inputProps.autoFocus}
        spellCheck={false}
      />
    </FieldShell>
  );
}

type TextareaFieldProps = {
  label: string;
  placeholder?: string;
  description?: string;
  /** Optional fields are announced as such (no `aria-required`). */
  optional?: boolean;
};

function TextareaField({ label, placeholder, description, optional }: TextareaFieldProps) {
  const field = useFieldContext<string>();
  const id = useId();
  const errors = errorMessages(field.state.meta.errors);
  const invalid = errors.length > 0;

  return (
    <FieldShell
      id={id}
      label={optional ? `${label} (facultatif)` : label}
      description={description}
      errors={errors}
    >
      <Textarea
        id={id}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={invalid}
        aria-required={optional ? undefined : true}
        aria-describedby={describedBy(id, invalid, description)}
        placeholder={placeholder}
        rows={3}
      />
    </FieldShell>
  );
}

type PasswordFieldProps = {
  label: string;
  autoComplete: "current-password" | "new-password";
  description?: string;
  labelAside?: ReactNode;
  autoFocus?: boolean;
};

function PasswordField({
  label,
  autoComplete,
  description,
  labelAside,
  autoFocus,
}: PasswordFieldProps) {
  const field = useFieldContext<string>();
  const id = useId();
  const [visible, setVisible] = useState(false);
  const errors = errorMessages(field.state.meta.errors);
  const invalid = errors.length > 0;

  return (
    <FieldShell
      id={id}
      label={label}
      labelAside={labelAside}
      description={description}
      errors={errors}
    >
      <div className="relative">
        <Input
          id={id}
          name={field.name}
          type={visible ? "text" : "password"}
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={invalid}
          aria-required
          aria-describedby={describedBy(id, invalid, description)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-offset-[-3px]"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
        >
          {visible ? (
            <Icon icon={ViewOffSlashIcon} className="size-4" />
          ) : (
            <Icon icon={ViewIcon} className="size-4" />
          )}
        </button>
      </div>
    </FieldShell>
  );
}

/**
 * Native fallback is a POST (never GET) so credentials can never end up in the URL,
 * and submission is only enabled once React has hydrated (see SubmitButton).
 * After a submit rejected by validation, focus moves to the first invalid field so
 * keyboard and screen-reader users land on the error to fix.
 */
function Form({ children, className }: { children: ReactNode; className?: string }) {
  const form = useFormContext();
  const formRef = useRef<HTMLFormElement>(null);

  async function submit() {
    await form.handleSubmit();
    if (form.state.isValid) return;
    // Next macrotask: React has committed aria-invalid by then (rAF would not run in
    // a background tab).
    setTimeout(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  }

  return (
    <form
      ref={formRef}
      method="post"
      noValidate
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void submit();
      }}
    >
      {children}
    </form>
  );
}

type SubmitButtonProps = {
  children: ReactNode;
  className?: string;
  /** Auth pages use the default full-width `lg` button; settings use compact ones. */
  size?: "default" | "lg";
  variant?: "default" | "ink" | "destructive";
};

function SubmitButton({
  children,
  className,
  size = "lg",
  variant = "default",
}: SubmitButtonProps) {
  const form = useFormContext();
  const hydrated = useHydrated();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          type="submit"
          size={size}
          variant={variant}
          className={cn("w-full", className)}
          disabled={!hydrated || isSubmitting}
        >
          {isSubmitting ? <Icon icon={Loading03Icon} className="animate-spin" aria-hidden /> : null}
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, TextareaField, PasswordField },
  formComponents: { Form, SubmitButton },
});

/** False during SSR and the first client render, true once React has hydrated. */
const noopSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
