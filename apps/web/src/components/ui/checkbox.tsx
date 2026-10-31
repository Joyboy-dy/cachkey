import { Tick02Icon } from "@hugeicons/core-free-icons";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/*
 * shadcn/ui checkbox adapted to the brand: same border and hover as text fields, orange
 * when checked with an ink tick (orange is always paired with ink). Focus uses the global
 * :focus-visible outline (styles/customs.css).
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[5px] border border-input bg-card transition-[background-color,border-color] duration-150 hover:border-foreground/55 disabled:cursor-not-allowed disabled:opacity-60",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current"
      >
        <Icon icon={Tick02Icon} className="size-3" strokeWidth={2.75} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
