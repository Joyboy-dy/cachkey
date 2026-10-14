import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Clamps long content to a few lines with a fade, and offers « Tout afficher ».
 * Expanded content is capped (`maxHeight`) and scrolls inside, so a certificate or a long
 * JSON never pushes the rest of the list away. Pattern adapted from interior.dev « Show More »
 * (CSS transition instead of a motion library; reduced motion disables it).
 */
export function ShowMore({
  children,
  lines = 3,
  maxHeight = 320,
  label,
  className,
}: {
  children: ReactNode;
  lines?: number;
  maxHeight?: number;
  /** Accessible name of the scrollable region once expanded. */
  label: string;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<{ line: number; full: number } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const read = () => {
      const styles = getComputedStyle(element);
      const parsed = Number.parseFloat(styles.lineHeight);
      const line = Number.isFinite(parsed) ? parsed : Number.parseFloat(styles.fontSize) * 1.5;
      const full = element.scrollHeight;
      setMetrics((previous) =>
        previous && previous.line === line && previous.full === full ? previous : { line, full },
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const clamped = metrics ? metrics.line * lines : undefined;
  const expandable = metrics && clamped !== undefined ? metrics.full - clamped > 1 : false;
  const open = expanded && expandable;
  const scrollable = open && metrics !== null && metrics.full > maxHeight;
  const height = !expandable ? undefined : open ? Math.min(metrics?.full ?? 0, maxHeight) : clamped;

  return (
    <div className={className}>
      <div
        ref={ref}
        id={id}
        role={scrollable ? "region" : undefined}
        aria-label={scrollable ? label : undefined}
        tabIndex={scrollable ? 0 : undefined}
        style={{ maxHeight: height }}
        className={cn(
          "motion-safe:transition-[max-height] motion-safe:duration-200 motion-safe:ease-out",
          scrollable ? "overflow-y-auto overscroll-contain" : "overflow-hidden",
          expandable && !open && "[mask-image:linear-gradient(to_bottom,black_55%,transparent)]",
        )}
      >
        {children}
      </div>
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            if (open) ref.current?.scrollTo({ top: 0 });
            setExpanded(!open);
          }}
          className="mt-1 text-xs font-medium text-muted-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-foreground"
        >
          {open ? "Réduire" : "Tout afficher"}
        </button>
      ) : null}
    </div>
  );
}
