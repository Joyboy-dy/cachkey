import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { type ReactNode, useId, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  /** Optional element aligned to the right of the label (e.g. a "forgot password" link). */
  labelAside?: ReactNode;
  description?: string;
  errors: string[];
  children: ReactNode;
};

function FieldShell({ id, label, labelAside, description, errors, children }: FieldShellProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      {children}
      {description && errors.length === 0 ? (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {errors.length > 0 ? (
        <p id={`${id}-error`} className="text-[13px] text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
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
        aria-describedby={invalid ? `${id}-error` : undefined}
        autoComplete={inputProps.autoComplete}
        placeholder={inputProps.placeholder}
        autoFocus={inputProps.autoFocus}
        spellCheck={false}
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
          aria-describedby={invalid ? `${id}-error` : description ? `${id}-description` : undefined}
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
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FieldShell>
  );
}

/**
 * Native fallback is a POST (never GET) so credentials can never end up in the URL,
 * and submission is only enabled once React has hydrated (see SubmitButton).
 */
function Form({ children, className }: { children: ReactNode; className?: string }) {
  const form = useFormContext();
  return (
    <form
      method="post"
      noValidate
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {children}
    </form>
  );
}

function SubmitButton({ children, className }: { children: ReactNode; className?: string }) {
  const form = useFormContext();
  const hydrated = useHydrated();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          type="submit"
          size="lg"
          className={cn("w-full", className)}
          disabled={!hydrated || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, PasswordField },
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
