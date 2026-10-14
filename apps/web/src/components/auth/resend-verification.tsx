import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";

const COOLDOWN_SECONDS = 60;

type Status = { kind: "idle" } | { kind: "sent" } | { kind: "error"; message: string };

/** Re-sends the verification email, with a client-side cooldown between attempts. */
export function ResendVerificationButton({
  email,
  initialCooldown = 0,
}: {
  email: string;
  initialCooldown?: number;
}) {
  const [isPending, setIsPending] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    setIsPending(true);
    setStatus({ kind: "idle" });
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/verify-email",
    });
    setIsPending(false);
    if (error) {
      setStatus({ kind: "error", message: getAuthErrorMessage(error) });
      return;
    }
    setStatus({ kind: "sent" });
    setCooldown(COOLDOWN_SECONDS);
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={isPending || cooldown > 0}
        onClick={resend}
      >
        {isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {cooldown > 0 ? `Renvoyer l’email (${cooldown} s)` : "Renvoyer l’email"}
      </Button>
      <p className="min-h-5 text-center text-[13px]" aria-live="polite">
        {status.kind === "sent" ? (
          <span className="text-success">Un nouvel email vient d’être envoyé.</span>
        ) : status.kind === "error" ? (
          <span className="text-destructive">{status.message}</span>
        ) : null}
      </p>
    </div>
  );
}
