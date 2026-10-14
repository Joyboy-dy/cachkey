---
name: chromatic-design
description: "Use when designing, extending, migrating, or auditing an interface color system: semantic tokens, palettes, light/dark themes, accessible foreground/background pairs, contrast, color roles, or CSS/Tailwind color usage."
---

# Chromatic Design

Build and maintain color systems that are coherent, accessible, and compatible with the project's existing styling architecture.

## Use when

Activate for requests involving palette creation, semantic color tokens, theme pairing, dark mode, contrast, brand-to-UI color translation, color migrations, or inconsistent raw color usage.

Do **not** use this as a general visual redesign skill. Hand typography, layout, composition, and art direction to `frontend-aesthetics`; use `ux-ui-audit` when the primary request is an evidence-based audit of an existing interface.

## Core rule: inspect before changing color syntax

Never assume OKLCH, HSL, hex, CSS variables, Tailwind, a component library, or any token naming convention. First inspect the repository and preserve its established representation unless the user explicitly asks for a migration or a new system is being created.

For new systems, prefer a perceptually useful color space such as OKLCH when the target browser/toolchain supports it. For existing systems, consistency and safe migration matter more than changing syntax for its own sake.

## Workflow

### 1. Discover the current system

Inspect the files that actually define or consume colors:

- global styles and theme files;
- framework/config files that extend colors;
- component-library theme variables;
- design-token files;
- utility classes and CSS modules;
- SVG/icon color handling;
- light/dark or multi-theme selectors.

Run the bundled scanner when a quick inventory is useful:

```bash
python scripts/color_tools.py scan <project-root> --json
```

Treat scanner output as candidates to inspect, not proof that a literal is wrong.

### 2. Map semantic roles before choosing values

Separate **roles** from **values**. Typical roles include:

- page/background and foreground;
- elevated/card/popover surfaces;
- muted/subtle surfaces and text;
- borders, dividers, focus rings;
- primary/secondary/accent actions;
- destructive, warning, success, informational states;
- charts/data-series colors when applicable.

Reuse the repository's role names when they already exist. Do not create duplicate aliases that mean the same thing.

### 3. Define interaction-state relationships

For interactive roles, account for default, hover, active/pressed, focus-visible, disabled, selected, and visited states where applicable. State changes must remain recognizable without relying on color alone when accessibility requires another cue.

### 4. Pair themes deliberately

Design light and dark themes as related systems, not mechanical inversions. Verify each semantic surface against its foreground independently in every theme. Preserve hierarchy: a dark theme still needs distinct background, surface, elevated surface, muted content, and borders.

### 5. Validate contrast

Use the project's accessibility target. For ordinary WCAG AA checks, evaluate text/background and meaningful UI boundaries separately. Do not infer compliance from visual appearance.

The helper can calculate a WCAG contrast ratio for opaque sRGB colors:

```bash
python scripts/color_tools.py contrast '#0a0a0a' '#ffffff'
```

Read `references/wcag-formulas.md` when exact luminance/contrast math or thresholds are relevant. Read `references/color-models.md` when selecting or converting color spaces.

### 6. Apply the smallest coherent change

Prefer changing semantic tokens over scattering new literals through components. Preserve public token names when possible. If a token rename or color-space migration is required, enumerate consumers and migrate them as one controlled change.

### 7. Validate in context

Check at minimum:

- all supported themes;
- normal/hover/focus/disabled/selected/error states;
- small text and subdued text;
- borders/focus rings against adjacent surfaces;
- destructive/success/warning information without color-only meaning;
- charts/legends if changed;
- screenshots or real rendered UI when available.

Run the repository's real typecheck/lint/tests/build when code was changed. Do not claim contrast or theme correctness from a static token scan alone.

## Migration rules

When the user explicitly asks to migrate a color system:

1. inventory existing definitions and consumers;
2. define old-role → new-role mapping before editing;
3. preserve semantics even when numeric values change;
4. avoid mixing two token systems indefinitely;
5. update documentation/examples in the same change;
6. verify both themes and high-risk states after migration.

If migration is not requested, do not turn maintenance into a color-system rewrite.

## Common failure modes

- Hard-coding brand colors directly into many components instead of assigning semantic roles.
- Treating dark mode as `invert()` or a value-by-value inversion.
- Checking only primary text while muted text, placeholder text, borders, and focus states fail.
- Introducing a new color syntax simply because it is newer.
- Using opacity over unknown backgrounds and calculating contrast against the wrong composited color.
- Declaring a palette accessible without evaluating actual foreground/background pairs.
- Removing existing aliases without finding all consumers.

## Output

When reporting color work, state:

1. the detected color architecture and theme mechanism;
2. the semantic roles affected;
3. exact changes or recommendations;
4. contrast results for pairs actually calculated;
5. states/themes validated;
6. remaining uncertainties requiring rendered inspection.
