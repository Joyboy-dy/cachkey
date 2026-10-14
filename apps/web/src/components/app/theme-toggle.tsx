import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toggleTheme, useIsDark } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * One-click light/dark switch (dashboard top bar only). Until it is used, the app follows
 * the device theme.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useIsDark();
  const label = isDark ? "Passer au thème clair" : "Passer au thème sombre";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn("size-9 text-muted-foreground hover:text-foreground", className)}
    >
      {/* The icon follows the applied theme in CSS, so it is right even before hydration. */}
      <Icon icon={Moon02Icon} className="size-[18px] dark:hidden" />
      <Icon icon={Sun03Icon} className="hidden size-[18px] dark:block" />
    </Button>
  );
}
