---
name: form-ux-validation
description: "Use when building, reviewing, debugging, or standardizing forms: field validation, schema/client/server consistency, dirty state, unsaved-change protection, submit behavior, error messaging, accessibility, notifications, or form UX across web projects."
---

# Form UX & Validation

Make forms trustworthy: user intent is preserved, validation has a clear source of truth, errors are actionable, and submission/navigation states behave consistently.

## Use when

Activate for form creation/refactors, validation bugs, client/server schema drift, required/optional confusion, dirty-state tracking, unsaved-change guards, duplicate submissions, field errors, form notifications, accessible labels/errors, or inconsistent form behavior.

This skill is **framework- and library-neutral**. It must adapt to the project rather than force React Hook Form, Zod, Formik, Yup, Joi, Valibot, Vest, native forms, a router, a toast library, or a backend framework.

## First rule: detect the form stack

Before editing, inspect:

- framework/router and rendering model;
- form-state library or native form handling;
- client validation mechanism;
- server/API validation and error shape;
- component library/form primitives;
- notification/toast system;
- navigation APIs and existing unsaved-change handling;
- tests around representative forms.

Use these read-only helpers to accelerate discovery:

```bash
python scripts/scan_form_ux.py <project-root> --json
python scripts/scan_validation_libs.py <project-root> --json
python scripts/scan_notification_usage.py <project-root> --json
```

Static results are leads. Confirm behavior in the real implementation before changing it.

## Form contract

For each form, establish these facts before coding:

1. **Initial values** — where they come from and when they reset.
2. **Editable fields** — type, optionality, constraints, normalization.
3. **Authoritative validation** — which boundary ultimately accepts/rejects data.
4. **Client validation** — what is mirrored early for fast feedback.
5. **Submission shape** — payload transformation and omitted/empty value semantics.
6. **Success effect** — redirect, close, reset, cache invalidation, refresh, optimistic update.
7. **Failure effect** — field-level vs form-level/server errors.
8. **Dirty definition** — what counts as a meaningful unsaved change.
9. **Navigation contract** — when leaving should be blocked or confirmed.
10. **Accessibility contract** — labels, descriptions, error relationships, focus/announcement behavior.

Read `references/schema-strategy.md` when validation exists in multiple layers.

## Workflow

### 1. Inspect one good neighboring form

Find a representative existing form that already follows project conventions. Reuse its primitives and error/submission patterns unless the task is explicitly to standardize or migrate them.

### 2. Establish validation ownership

The server or persistence boundary must not trust client-only validation. The client should provide early feedback without becoming a divergent second specification.

When client and server schemas can be safely shared, share the contract. When they cannot, maintain an explicit mapping and tests for overlapping fields/constraints.

Do not weaken server validation to make a client form pass.

### 3. Normalize values deliberately

Decide how the application treats:

- empty string vs `null` vs omitted;
- numeric text input vs number;
- whitespace trimming;
- booleans/checkboxes;
- arrays with zero selections;
- dates/time zones;
- file inputs;
- hidden/conditionally displayed fields.

Normalize at a well-defined boundary, not ad hoc in several components.

### 4. Design error behavior

Prefer field errors beside the field when the user can fix one input. Use form-level errors for cross-field, authorization, concurrency, network, or unknown server failures.

On failed submit:

- preserve user input unless there is a strong safety reason not to;
- make the first actionable error discoverable/focusable when appropriate;
- connect messages programmatically to controls;
- avoid duplicate toast + inline messages for the same validation failure;
- do not expose raw internal/server exception text.

Read `references/form-accessibility.md` for label/error/focus details.

### 5. Make submit state deterministic

During submission:

- prevent accidental duplicate submits when the action is not idempotent;
- expose pending state without destroying button width/layout unnecessarily;
- keep cancellation/navigation behavior explicit;
- handle stale responses or concurrency if the form can be submitted more than once;
- only show success after authoritative success.

Do not clear dirty state before the save is confirmed.

### 6. Track dirty state semantically

Dirty should mean “current meaningful values differ from the baseline the user believes is saved.” Account for normalization and programmatic resets.

After a successful save, update/reset the baseline so the form is no longer dirty. Avoid a second custom dirty mechanism if the existing form library already models this correctly.

Read `references/dirty-state.md` for implementation patterns and edge cases.

### 7. Guard unsaved navigation proportionally

Only guard when there are meaningful unsaved changes. Cover the navigation surfaces that actually exist in the project: internal links/router navigation, close/back flows, browser tab/window unload where supported, modal/drawer dismissal, or native app navigation.

Do not assume one browser event can reliably intercept every client-side navigation mechanism.

Read `references/navigation-guards.md` before implementing a guard.

### 8. Use notifications with discipline

A toast/notification should communicate asynchronous or global outcomes, not replace field-level validation. Reuse the project's existing notification system. Do not introduce a new library solely for one form unless explicitly requested.

Read `references/notifications.md` when standardizing submit feedback.

### 9. Validate behavior, not just types

Test representative paths:

- empty/default submit;
- invalid field and cross-field values;
- server rejection not reproducible client-side;
- pending/double-click behavior;
- successful save and dirty reset;
- failed save retaining input/dirty state;
- navigation with clean vs dirty form;
- keyboard submit and focus after errors;
- conditional fields changing requiredness;
- edit form with server-provided initial values.

Run the repository's actual typecheck/lint/tests/build when changes warrant it.

## Schema drift helper

If you have two JSON descriptions of fields, compare their top-level keys without coupling the skill to a schema library:

```bash
python scripts/compare_schema_fields.py client-fields.json server-fields.json
```

This detects missing/extra keys only. It does not prove equivalent validation semantics.

## Common failure modes

- Forcing a favorite form/schema/toast library into a repository that already has a sound standard.
- Duplicating schema constraints by hand and letting them drift.
- Validating only in the browser.
- Marking a form clean when a request starts instead of when it succeeds.
- Showing a generic toast while actionable field errors are hidden.
- Resetting the form after an error and losing user input.
- Blocking navigation for unchanged forms.
- Depending solely on `beforeunload` for SPA navigation.
- Rendering required indicators that disagree with actual validation.
- Disabling a submit control in a way that prevents users from discovering why submission is impossible.
- Treating successful HTTP transport as successful domain validation.

## Output

For form work, state the detected stack; form contract; validation ownership; dirty/navigation behavior; error/notification behavior; files changed; tests/interaction paths actually validated; and any browser/framework limitation still requiring manual verification.
