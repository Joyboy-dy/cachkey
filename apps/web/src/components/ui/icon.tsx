import { HugeiconsIcon, type HugeiconsIconProps, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export type { IconSvgElement };

/**
 * Hugeicons wrapper — the only icon set used by the interface (brand marks such as
 * Google/GitHub excepted, see components/icons). Icons are decorative unless given an
 * `aria-label`; size them with `size-*` classes (buttons size their icons themselves).
 */
export function Icon({ className, strokeWidth = 1.75, ...props }: HugeiconsIconProps) {
  const labelled = Boolean(props["aria-label"]);
  return (
    <HugeiconsIcon
      strokeWidth={strokeWidth}
      aria-hidden={labelled ? undefined : true}
      role={labelled ? "img" : undefined}
      focusable="false"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}
