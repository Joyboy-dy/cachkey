# Refactoring playbook

Use for structural changes that move ownership or public imports.

## 1. Baseline

Run relevant tests/build first and record current failures. Identify public imports/routes/config/data contracts touched by the change.

## 2. Add characterization coverage

For risky behavior that lacks tests, add the smallest regression test that captures current externally observable behavior before moving it.

## 3. Introduce the target boundary

Create the new owner with a narrow contract. Keep implementation equivalent initially; do not combine behavioral redesign with structural movement unless required.

## 4. Migrate consumers incrementally

Move one coherent consumer group at a time. Keep a temporary compatibility export/adapter if external/internal consumers cannot move atomically.

## 5. Validate after each step

Run type/compiler/tests and search for stale imports/old names. For runtime boundaries, exercise the affected path.

## 6. Remove compatibility only after migration

Confirm no consumers remain before deleting old paths. Update documentation and architecture notes that point to the old location.

## 7. Diff hygiene

Avoid unrelated formatting/renames during a structural refactor; review should make ownership changes obvious.
