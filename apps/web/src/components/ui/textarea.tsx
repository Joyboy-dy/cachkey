import type * as React from "react";
import { cn } from "@/lib/utils";

/** Multi-line field — same border, hover and focus treatment as `Input`. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-base transition-[color,box-shadow,border-color] duration-200 selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground/80 hover:border-foreground/55 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
        "focus-visible:border-ring focus-visible:shadow-[0_0_0_2px_rgb(212_88_15/0.16)]",
        "aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:shadow-[0_0_0_2px_rgb(180_35_24/0.14)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
