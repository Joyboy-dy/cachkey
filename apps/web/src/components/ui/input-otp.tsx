import { MinusSignIcon } from "@hugeicons/core-free-icons";
import { OTPInput, OTPInputContext } from "input-otp";
import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/*
 * shadcn/ui input-otp adapted to the brand: separate slots with the text field look (card
 * background, `--input` border, orange border + light halo on the active slot) and Geist
 * Mono digits; sized so 6 slots fit a 320 px screen. `aria-invalid` on a slot marks an error.
 */
function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-1.5 has-disabled:opacity-60 sm:gap-2",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center gap-1.5 sm:gap-2", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative flex h-11 w-10 items-center justify-center rounded-md border border-input bg-card font-mono text-lg font-medium tabular-nums transition-[box-shadow,border-color] duration-200 sm:h-12 sm:w-11",
        "data-[active=true]:border-ring data-[active=true]:shadow-[0_0_0_2px_rgb(212_88_15/0.16)]",
        "aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:shadow-[0_0_0_2px_rgb(180_35_24/0.14)]",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      ) : null}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      role="separator"
      className="text-muted-foreground"
      {...props}
    >
      <Icon icon={MinusSignIcon} className="size-4" />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
