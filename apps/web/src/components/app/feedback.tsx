import { AlertCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";

export type Feedback = { tone: "success" | "error"; message: string } | null;

/** Result message of a settings action, announced to screen readers. */
export function FeedbackAlert({ feedback, className }: { feedback: Feedback; className?: string }) {
  if (!feedback) return null;
  const success = feedback.tone === "success";
  return (
    <Alert
      variant={success ? "success" : "destructive"}
      role={success ? "status" : "alert"}
      className={className}
    >
      <Icon icon={success ? CheckmarkCircle02Icon : AlertCircleIcon} />
      <AlertDescription>{feedback.message}</AlertDescription>
    </Alert>
  );
}
