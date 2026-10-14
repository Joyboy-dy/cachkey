---
name: ux-ui-audit
description: "Use when auditing an existing interface for usability, accessibility, responsive behavior, hierarchy, consistency, interaction states, form/table/dialog issues, design-token misuse, or evidence-based UX/UI defects and prioritizing fixes."
---

# UX/UI Audit

Audit what exists, record evidence, prioritize impact, and avoid silently redesigning the product.

## Use when

Activate for “audit/review this UI,” accessibility review, responsive/state consistency checks, design-system misuse, interaction friction, contrast/focus problems, or requests for prioritized UI findings.

Use `frontend-aesthetics` after the audit when the user wants a new visual direction. Use `chromatic-design` for detailed color-system repair and `form-ux-validation` for deep form behavior.

## Audit stance

- Separate observed evidence from inference and recommendation.
- Evaluate the user's task and state transitions, not only screenshots at rest.
- Severity reflects user impact, frequency/reach, and task blockage—not personal taste.
- Respect product context and existing design system.
- Automated/static scans are triage only; runtime and assistive-technology checks are stronger evidence where available.
- Do not report standards compliance that was not actually tested.

## Workflow

### 1. Establish scope

Identify target pages/components, supported themes/viewports, interaction paths, accessibility target if known, and whether source code, rendered UI, screenshots, or all three are available.

### 2. Discover design and component conventions

Inspect tokens, primitives, layouts, representative screens, and accessibility utilities. This distinguishes a local defect from an intentional system rule.

### 3. Run static triage when source is available

```bash
python scripts/scan_a11y_static.py <project-root> --json
```

Investigate matches manually. The script intentionally avoids pretending to be a full accessibility engine.

### 4. Audit by user journey and state

For each relevant task, inspect:

- default/content state;
- loading/skeleton;
- empty/no-results;
- error/retry;
- hover/focus/active/selected/disabled;
- validation/success where forms exist;
- overlays/dialogs/menus;
- long/overflowing content;
- narrow and wide responsive states;
- theme variants when supported.

Read `references/state-patterns.md` for state coverage.

### 5. Accessibility review

Check semantics, accessible names, heading/landmark structure, keyboard order/operability, focus visibility/management, labels/errors, status announcements, color contrast, non-color cues, target sizes where applicable, reduced motion, and zoom/reflow.

Use automated tools already present in the repository when available, but manually verify high-impact flows. Do not claim a WCAG conformance level from a static source scan.

### 6. Usability and hierarchy

Ask whether the interface makes the next action obvious, groups related content, uses consistent terminology, provides feedback, prevents/recover from errors, and avoids unnecessary cognitive load. Flag visual inconsistencies when they impair hierarchy or learnability, not merely because two values differ.

### 7. Responsive behavior

Audit reflow strategy, overflow, tables/data density, nav/action reachability, touch targets, fixed/sticky elements, dialogs, text wrapping, and input ergonomics. Test actual breakpoints/containers rather than only desktop/mobile screenshots.

### 8. Prioritize findings

Use severity:

- **Critical:** blocks a core task, creates serious access/safety/data-loss risk, or makes key content unusable.
- **High:** major friction or accessibility failure affecting an important path.
- **Medium:** meaningful inconsistency/friction with workaround.
- **Low:** polish or minor inconsistency with limited user impact.

For each finding include evidence/location, impact, recommendation, and validation method.

Use `assets/audit-report-template.md` for a formal report and `references/audit-checklist.md` before finalizing.

## Common failure modes

- Turning an audit into an unsolicited redesign.
- Listing generic best practices with no evidence/location.
- Treating lint/static matches as confirmed accessibility failures.
- Auditing only the happy/default state.
- Calling every inconsistency “high severity.”
- Assuming a component library guarantees accessible usage.
- Giving exact contrast claims without calculating the rendered pair.
- Ignoring responsive overflow/keyboard/focus because screenshots look good.

## Output

Prefer a prioritized findings table plus a short summary of systemic patterns. Clearly mark what was statically inspected, interactively tested, automatically tested, or not testable in the available environment.
