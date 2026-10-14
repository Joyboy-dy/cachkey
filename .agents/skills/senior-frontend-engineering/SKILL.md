---
name: senior-frontend-engineering
description: "Use when implementing or refactoring substantial frontend features with production-quality component ownership, state/data flow, API contracts, accessibility, testing, performance, error handling, and maintainability across modern frontend frameworks."
---

# Senior Frontend Engineering

Implement frontend work as maintainable product code, adapting to the repository's actual framework and conventions.

## Use when

Activate for non-trivial frontend implementation/refactoring, component boundaries, state ownership, async data flows, API integration, design-system integration, dependency choices, error/loading states, frontend test strategy, or maintainability/performance review.

Use a framework-specific skill alongside this one when available. `nextjs-architecture-pattern` owns Next.js-specific routing/rendering details. `frontend-aesthetics` owns visual art direction. `form-ux-validation` owns detailed form behavior.

## Operating rules

- Inspect before implementing: framework, package manager, source layout, components, styling, state/data libraries, API client, tests, lint/type/build scripts.
- Preserve existing sound conventions instead of importing a preferred personal stack.
- Keep state as local as possible and elevate it only when multiple owners need the same source of truth.
- Reuse stable primitives and tokens before creating near-duplicates.
- Model async states explicitly: idle/loading/success/empty/error/stale as relevant.
- Keep server/API validation and authorization authoritative; frontend checks improve UX, not trust.
- Do not add a dependency when platform/framework/existing utilities solve the task cleanly.
- Avoid speculative abstractions and premature global state.

## Workflow

### 1. Establish ownership

Identify which component/module owns the data, mutation, UI state, and side effects. Read `references/architecture-and-ownership.md` for ambiguous cases.

### 2. Trace contracts

Inspect the actual API/types/schema and error behavior. Determine input/output/nullability, pagination, permissions, loading/retry/cancellation behavior, and cache invalidation. Do not infer a contract from UI labels.

### 3. Design component boundaries

Split where responsibility, reuse, testing, rendering boundary, or state ownership warrants it. Avoid one-file mega-components, but do not atomize trivial markup into wrappers with no independent meaning.

### 4. Integrate the design system

Use existing tokens/primitives/variants. Add reusable variants at the appropriate primitive layer when several consumers need them. Read `references/design-system.md` for integration rules.

### 5. Handle state and effects deliberately

Prefer derived values over synchronized duplicate state. Effects are for synchronization with external systems, not for ordinary value derivation. Clean up subscriptions/timers/requests when the framework requires it. Prevent stale async writes when race conditions are possible.

### 6. Make errors and loading useful

Keep layout stable where practical. Preserve prior useful data during refresh when the product expects it. Give actionable recovery for recoverable errors. Do not swallow exceptions or turn all errors into an undifferentiated toast.

### 7. Accessibility and keyboard behavior

Use semantic elements, labels/names, visible focus, keyboard operability, appropriate announcements, and correct disabled/read-only semantics. Component-library usage does not automatically prove accessibility.

### 8. Test risk, not implementation trivia

Prioritize tests around contracts, user-visible state transitions, regressions, permissions/edge cases, and reusable logic. Avoid snapshot-only confidence for behavior-heavy features.

### 9. Validate end-to-end

Run available formatter/lint/typecheck/tests/build and exercise representative runtime paths when possible. Read `references/guardrails-and-workflow.md` before broad or high-risk refactors.

Use the health scanner for fast repository triage:

```bash
python scripts/frontend_health.py <project-root> --json
```

## Common failure modes

- Replacing an existing library because another is more familiar.
- Copying API types by hand into several UI files.
- Globalizing modal/filter/form state with one consumer.
- Effects that continuously synchronize state that could be derived.
- Duplicate Button/Card/Dialog variants scattered across feature folders.
- Happy-path-only UI with no empty/error/pending handling.
- Optimistic UI that treats local state as authoritative success.
- Huge refactor bundled into an unrelated feature.
- Accessibility checked only by visual appearance.
- “Performance optimization” without measuring or identifying an actual hot path.

## Output

State detected stack/conventions, ownership and contract decisions, implementation changes, user-visible states covered, dependencies added/avoided, validations actually run, and remaining runtime uncertainty.
