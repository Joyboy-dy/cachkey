import type * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-base transition-[color,box-shadow,border-color] duration-200 selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground/80 hover:border-foreground/55 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
        "focus-visible:border-ring focus-visible:shadow-[0_0_0_2px_rgb(212_88_15/0.16)]",
        "aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:shadow-[0_0_0_2px_rgb(180_35_24/0.14)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
