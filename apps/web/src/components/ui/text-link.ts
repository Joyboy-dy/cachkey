import { cva } from "class-variance-authority";

/**
 * Inline text links. `emphasis`: ink label with an orange underline (brand marker),
 * which turns ink on hover. `subtle`: secondary link, underlined on hover only.
 * Both keep a ≥ 24 px tall hit area (WCAG 2.5.8).
 */
export const textLinkVariants = cva(
  "inline-block rounded-sm py-0.5 underline-offset-4 transition-colors duration-200",
  {
    variants: {
      variant: {
        emphasis:
          "font-medium text-foreground underline decoration-primary decoration-2 hover:decoration-foreground",
        subtle: "text-[13px] text-muted-foreground hover:text-foreground hover:underline",
      },
    },
    defaultVariants: { variant: "emphasis" },
  },
);
