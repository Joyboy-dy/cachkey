import { cn } from "@/lib/utils";

/*
 * Official, outlined logo files from the brand kit (never re-typed).
 * The SVGs are cropped to the visible drawing: the protection zone (x = H/4)
 * must be provided by the surrounding layout.
 * Minimum sizes: horizontal ≥ 160 px wide (190 px in navigation), symbol ≥ 24 px tall.
 */

type LogoProps = {
  /**
   * `auto` (default) follows the theme: `color` in light mode, `inverse` (orange symbol +
   * white name) in dark mode. Force `color` / `inverse` for a fixed background.
   */
  variant?: "auto" | "color" | "inverse";
  className?: string;
};

const LOGO_SOURCES = {
  color: "/brand/cachkey-horizontal-couleur.svg",
  inverse: "/brand/cachkey-horizontal-inverse.svg",
} as const;

export function Logo({ variant = "auto", className }: LogoProps) {
  if (variant !== "auto") return <LogoImage src={LOGO_SOURCES[variant]} className={className} />;
  // Both files are rendered and swapped in CSS, so the right one shows before hydration.
  return (
    <>
      <LogoImage src={LOGO_SOURCES.color} className={cn("dark:hidden", className)} />
      <LogoImage
        src={LOGO_SOURCES.inverse}
        className={cn("hidden dark:block", className)}
        decorative
      />
    </>
  );
}

function LogoImage({
  src,
  className,
  decorative = false,
}: {
  src: string;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      src={src}
      alt={decorative ? "" : "Cachkey"}
      width={190}
      height={40}
      className={cn("h-auto w-[190px] select-none", className)}
      draggable={false}
    />
  );
}

/** Symbol only, used decoratively (aria-hidden) where the full logo appears elsewhere. */
export function LogoSymbol({ className }: { className?: string }) {
  return (
    <img
      src="/brand/cachkey-symbole-couleur.svg"
      alt=""
      aria-hidden
      width={88}
      height={121}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
