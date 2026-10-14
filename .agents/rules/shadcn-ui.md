# shadcn/ui — cursors, focus and visual micro-adjustments

## Files

- `apps/web/src/styles.css` — canonical shadcn/ui base only: theme, tokens, and the
  official cursor baseline (`button:not(:disabled)`, `[role="button"]:not(:disabled)`),
  equivalent to `npx shadcn@latest init --pointer`. Never mix project extensions in it.
- `apps/web/src/styles/customs.css` — every Cachkey extension (focus indicator, extra
  cursors, motion), imported from `styles.css`, headed "not part of shadcn/ui spec".
- Components are added with the shadcn CLI, then adapted to the brand. Check imports
  after `shadcn add`: the CLI resolves the `cn` alias to a bogus `cn` npm package (imports
  must be `@/lib/utils`; remove the package). It may also emit lucide icons and English
  sr-only labels: switch to `<Icon>` (Hugeicons) and French labels. Never let it overwrite
  `button`, `input`, `label`, `separator`, `alert` (brand-adapted).

## Cursor policy

- Official shadcn/ui baseline = buttons and `[role="button"]` only. Anything else
  (native checkbox/radio/select/file, ARIA tab/menuitem/option/checkbox/radio/switch,
  and future Select, Dropdown, Command, Slider, Resizable…) is a project convention.
- Disabled: rely on each component's native mechanism (`disabled:cursor-not-allowed`,
  `data-disabled:cursor-not-allowed`, `pointer-events: none`). Never force
  `pointer-events: auto` on a natively disabled control.
- Match ARIA/data disabled on the explicit value `"true"` (`:not([aria-disabled="true"])`,
  `:not([data-disabled="true"])`): some libraries (cmdk) set `data-disabled="false"`.
- When those components are installed: Slider track `ew-resize`/`ns-resize`, thumb
  `grab`/`grabbing`; Resizable handle `col-resize`/`row-resize`.

## data-slot contracts

- Never write a selector on a `data-slot` without reading it in the installed
  `components/ui/*.tsx`. Never guess slot names.
- Never build a check or selector on utility class names; use structural contracts:
  `data-slot`, `role`, ARIA/data state.
- When one slot serves several roles (e.g. `dialog-close` for the corner cross and a
  footer button), scope by structure: `[data-slot="dialog-content"] > [data-slot="dialog-close"]`.
- Visual fixes for third-party presets go in `customs.css` with a comment naming the
  preset — never edit `components/ui/` for that.
- `scripts/check-ui-cursor-contracts.mjs` (`bun run check:ui`, part of `bun run check`)
  fails when a `data-slot` used in CSS no longer exists in `components/ui/`. Any new
  extension ships together with a passing run of this gate.

## Focus

- One global `:focus-visible` outline (2 px, `--ring`, offset 2 px) in `customs.css`.
- Text fields: orange border + 2 px light halo, defined in `components/ui/input.tsx`.
- `--ring` and `--input` are chosen for ≥ 3:1 contrast against white (WCAG 1.4.11).
