import { cn } from "@/lib/utils";

/*
 * Official, outlined logo files from the brand kit (never re-typed).
 * The SVGs are cropped to the visible drawing: the protection zone (x = H/4)
 * must be provided by the surrounding layout.
 * Minimum sizes: horizontal ≥ 160 px wide (190 px in navigation), symbol ≥ 24 px tall.
 */

type LogoProps = {
  /** `color` on light backgrounds, `inverse` (orange symbol + white name) on ink. */
  variant?: "color" | "inverse";
  className?: string;
};

const LOGO_SOURCES = {
  color: "/brand/cachkey-horizontal-couleur.svg",
  inverse: "/brand/cachkey-horizontal-inverse.svg",
} as const;

export function Logo({ variant = "color", className }: LogoProps) {
  return (
    <img
      src={LOGO_SOURCES[variant]}
      alt="Cachkey"
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
