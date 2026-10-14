import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/*
 * A single row that scrolls horizontally when it does not fit (filter chips, tabs…):
 * no visible scrollbar, and a soft fade on each edge only while content is hidden on that
 * side. Works with touch, trackpad, mouse wheel (vertical wheel scrolls the row) and
 * keyboard (the focused item is brought into view).
 */

const FADE = "1.5rem";
const FADE_PX = 24;

/** Scrolls the row only (never the page) so that `item` is clear of the edge fades. */
function reveal(row: HTMLElement, item: HTMLElement) {
  // The row is `relative`, so offsets are measured from its own edge.
  const start = item.offsetLeft;
  const end = start + item.offsetWidth;
  if (start - FADE_PX < row.scrollLeft) row.scrollLeft = Math.max(0, start - FADE_PX);
  else if (end + FADE_PX > row.scrollLeft + row.clientWidth) {
    row.scrollLeft = end + FADE_PX - row.clientWidth;
  }
}

export function ScrollRow({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Accessible name of the group (e.g. « Type d’activité »). */
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Fades are CSS variables updated from the scroll position: no re-render while scrolling.
  const update = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    element.style.setProperty("--fade-start", element.scrollLeft > 1 ? FADE : "0px");
    element.style.setProperty("--fade-end", element.scrollLeft < max - 1 ? FADE : "0px");
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);

    // A vertical mouse wheel over the row scrolls it sideways while it can still move;
    // at either end the page scrolls as usual. Non-passive, to stop the page meanwhile.
    function onWheel(event: WheelEvent) {
      if (!element || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const max = element.scrollWidth - element.clientWidth;
      const canMove = event.deltaY > 0 ? element.scrollLeft < max - 1 : element.scrollLeft > 1;
      if (!canMove) return;
      event.preventDefault();
      element.scrollLeft += event.deltaY;
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", onWheel);
    };
  }, [update]);

  // Keep the selected item visible (on load and after a change).
  useEffect(() => {
    const element = ref.current;
    const selected = element?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (element && selected) reveal(element, selected);
  });

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      onScroll={update}
      onFocus={(event) => {
        if (event.target instanceof HTMLElement && event.target !== event.currentTarget) {
          reveal(event.currentTarget, event.target);
        }
      }}
      className={cn(
        "relative flex [scrollbar-width:none] gap-1.5 overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth [&::-webkit-scrollbar]:hidden",
        // Room for focus rings, which overflow would otherwise cut.
        "-my-1 py-1",
        "[mask-image:linear-gradient(to_right,transparent,black_var(--fade-start,0px),black_calc(100%-var(--fade-end,0px)),transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
