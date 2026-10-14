---
name: frontend-aesthetics
description: "Use when improving the visual quality, hierarchy, typography, spacing, composition, density, responsive polish, or overall art direction of an existing or new frontend interface while respecting its design system."
---

# Frontend Aesthetics

Turn a functional interface into a deliberate visual system without replacing the project's identity or component architecture unnecessarily.

## Use when

Activate for UI polish, visual hierarchy, layout composition, density, typography, spacing rhythm, responsive refinement, dashboard/card composition, empty states, or requests such as “make this look professional/premium/coherent.”

Do not use as a substitute for an accessibility audit (`ux-ui-audit`), color-system engineering (`chromatic-design`), or frontend architecture (`senior-frontend-engineering`).

## Principles

- **Inherit before inventing.** Inspect existing tokens, components, typography, icons, spacing, radius, shadows, and motion before introducing new choices.
- **Hierarchy over decoration.** Improve reading order, grouping, emphasis, and whitespace before adding effects.
- **One visual language.** Repeated surfaces and actions should feel related across the product.
- **Content drives composition.** Do not force every screen into identical cards or symmetrical grids.
- **Responsive is a composition change.** Preserve hierarchy and usability, not merely smaller dimensions.
- **Polish must survive states.** Loading, empty, error, disabled, focus, overflow, and long content are part of the design.

## Workflow

### 1. Discover the design language

Inspect global styles, theme/tokens, component primitives, layout shells, typography, icons, animation utilities, and several representative screens. Identify repeated spacing and component patterns.

Use the static smell scan for quick candidates:

```bash
python scripts/scan_visual_smells.py <project-root> --json
```

Raw values are not automatically wrong; use the scan to find inconsistency hotspots.

### 2. State the visual problem

Describe the current problem in terms of hierarchy, rhythm, density, contrast, alignment, affordance, or responsiveness. Avoid vague labels such as “ugly” or “modernize.”

### 3. Choose an art direction with constraints

Define a small set of decisions: page density, dominant surface treatment, typographic scale, spacing rhythm, emphasis strategy, border/radius/shadow behavior, and motion restraint. Preserve brand/design-system constraints already present.

Read `references/art-direction.md` when a screen lacks clear hierarchy or needs a new composition.

### 4. Reuse primitives first

Prefer existing Button/Card/Dialog/Table/Form/etc. primitives and theme tokens. Customize composition around them before duplicating components or hard-coding one-off styles. If a missing primitive is genuinely reusable, add it in the project's established component layer.

### 5. Polish high-impact details

Prioritize:

1. page/frame spacing and max-width;
2. heading/subheading/action hierarchy;
3. grid alignment and grouping;
4. typography and line length;
5. control sizes and hit targets;
6. surface separation;
7. empty/loading/error states;
8. responsive collapse/reflow;
9. subtle motion only where it clarifies change or relationship.

Read `references/polish-checklist.md` before finalizing a broad UI polish task.

### 6. Validate rendered behavior

Inspect real output at representative viewport widths. Check long labels, localization-sized text, data-heavy states, empty states, focus-visible, reduced-motion behavior when motion is present, and light/dark themes when supported.

Run repository typecheck/lint/tests/build when implementation changes require them.

## Avoid

- Generic “AI dashboard” styling: excessive gradients, glow, glass, huge radii, decorative badges, or every section in a card.
- Adding animation everywhere.
- Replacing an established icon/component library for visual preference alone.
- Hard-coded colors that bypass theme tokens.
- Desktop-first layouts that merely stack at mobile width.
- Removing useful information to achieve visual minimalism.
- Redesigning the entire application when the request concerns one screen.

## Output

Explain the detected design language, visual issues, chosen direction, exact changes, responsive/state checks, and any compromises or unvalidated rendered details.
