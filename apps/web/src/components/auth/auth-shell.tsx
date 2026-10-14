import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CipherField } from "@/components/brand/cipher-field";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Centred layout shared by every authentication screen: the logo above the form card,
 * on a quiet "cipher field" background that fades out behind the content.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center overflow-hidden px-4">
      <CipherField className="pointer-events-none absolute inset-0 -z-10 size-full [mask-image:radial-gradient(ellipse_62%_70%_at_50%_48%,transparent_40%,black_95%)]" />

      <main className="animate-brand-in flex w-full max-w-[420px] flex-1 flex-col justify-center py-12 sm:py-16">
        <Link to="/" aria-label="Cachkey — accueil" className="mx-auto mb-10 rounded-sm p-2.5">
          <Logo />
        </Link>

        <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgb(26_26_26/0.04),0_16px_48px_-20px_rgb(26_26_26/0.14)] transition-[border-color,box-shadow] duration-300 focus-within:border-primary/25 focus-within:shadow-[0_1px_2px_rgb(26_26_26/0.04),0_20px_56px_-24px_rgb(249_115_22/0.14)] sm:p-9 dark:shadow-none">
          {children}
        </div>
      </main>

      <footer className="pb-6 font-mono text-[11px] tracking-wide text-muted-foreground">
        OPEN SOURCE / AUTO-HÉBERGEABLE
      </footer>
    </div>
  );
}

type AuthHeaderProps = {
  title: string;
  description?: ReactNode;
  /**
   * Outcome screens only: a thin coloured line along the top edge of the card (green for
   * success, red for an error). No icon or label — the title already says it in words.
   */
  tone?: "success" | "error";
};

export function AuthHeader({ title, description, tone }: AuthHeaderProps) {
  return (
    <header className="mb-7">
      {tone ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            tone === "success" ? "bg-success/70" : "bg-destructive/70",
          )}
        />
      ) : null}
      <h1 className="text-2xl leading-[30px] font-bold tracking-tight text-balance">{title}</h1>
      {description ? (
        <p className="mt-2 text-sm leading-[22px] text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}

/** Secondary navigation line under a form ("Pas encore de compte ? Créer un compte"). */
export function AuthFooterLink({ children }: { children: ReactNode }) {
  return <p className="mt-7 border-t pt-6 text-center text-sm text-muted-foreground">{children}</p>;
}
