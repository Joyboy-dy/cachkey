---
name: ui-modern-2026
description: "Use when evaluating or adopting modern web UI capabilities such as contemporary CSS layout, container queries, relational selectors, native dialogs/popovers, view transitions, newer color functions, or progressive enhancement while preserving compatibility and accessibility."
---

# Modern UI 2026

Use modern platform capabilities when they simplify the interface or improve experience, with explicit compatibility and fallback reasoning.

## Use when

Activate for requests to modernize CSS/UI implementation, replace JavaScript with capable platform primitives, evaluate newer CSS features, adopt progressive enhancement, or review whether newer browser APIs can simplify an interface.

Do not activate merely to make a UI visually “modern.” Visual direction belongs to `frontend-aesthetics`. Color-system work belongs to `chromatic-design`.

## Rules

- Detect the project's browser support policy, framework, CSS tooling, component library, and existing progressive-enhancement strategy first.
- Prefer stable platform features when they remove complexity, but do not chase novelty for its own sake.
- Verify current browser/toolchain support for any capability that is version-sensitive.
- Preserve accessibility semantics and keyboard/focus behavior when replacing scripted components with native primitives.
- Provide a fallback when absence of the feature would break core functionality; enhancement-only features may degrade gracefully.
- Do not force a CSS color-space migration or a component-library migration as collateral work.

## Workflow

1. Identify the current implementation pain: excess JS, brittle viewport media queries, complex DOM targeting, animation plumbing, custom overlay behavior, or duplicated responsive variants.
2. Inspect declared browser targets and actual deployment audience if available.
3. Choose the smallest platform capability that addresses the pain.
4. Separate **required behavior** from **enhancement**.
5. Implement a safe baseline first when compatibility requires it.
6. Add the modern enhancement behind natural CSS feature behavior or capability detection where necessary.
7. Test keyboard, focus, reduced motion, responsive layout, and supported browsers.
8. Run normal repository checks.

Read `references/modern-css.md` for capability categories and `references/effects-catalog.md` when selecting restrained visual effects. Read `references/component-library-integration.md` before changing behavior owned by a component library.

Use the static scanner to find modern CSS features already present:

```bash
python scripts/scan_modern_css.py <project-root> --json
```

## Examples of appropriate capabilities

Depending on current support and project policy: container queries, `:has()`, logical properties, subgrid, cascade layers, `@supports`, modern color functions, native dialog/popover behaviors, scroll-driven/view-transition enhancements, and reduced-motion-aware transitions.

This list is illustrative, not a requirement. Verify current support rather than relying on the skill's publication year.

## Avoid

- Adding a polyfill for an enhancement that can simply degrade.
- Replacing a mature accessible component with a native primitive without checking missing behavior.
- Using experimental APIs in critical paths without explicit product acceptance.
- Large visual effect stacks that reduce readability/performance.
- Assuming desktop Chrome support equals project support.
- Shipping motion without reduced-motion consideration.

## Output

State the current implementation, capability selected, compatibility evidence/policy, baseline/fallback, accessibility implications, files changed, and tests actually performed.
