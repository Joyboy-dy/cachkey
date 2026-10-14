import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centred content column shared by every application page. */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="animate-brand-in mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      {children}
    </div>
  );
}

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Primary page action(s), aligned right on wide screens. */
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl leading-8 font-semibold tracking-tight text-balance sm:text-[28px] sm:leading-9">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

type SectionCardProps = {
  title: string;
  description?: string;
  /** Optional element shown on the right of the title (badge, link…). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Titled white panel grouping related content on a page. */
export function SectionCard({ title, description, aside, children, className }: SectionCardProps) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <header className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base leading-6 font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** Small neutral pill, e.g. « Bientôt ». */
export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap",
        tone === "success" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
