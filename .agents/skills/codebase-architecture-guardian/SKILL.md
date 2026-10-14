---
name: codebase-architecture-guardian
description: "Use when inspecting an unfamiliar repository, deciding where new code belongs, reviewing architectural boundaries, preventing dependency drift, planning a cross-cutting refactor, or checking that a change fits the codebase's existing structure."
---

# Codebase Architecture Guardian

Protect architectural coherence by discovering the repository's **actual** boundaries before proposing new ones.

## Use when

Activate for repository archaeology, ownership questions, folder/module placement, dependency direction, duplicated abstractions, cross-cutting refactors, architecture reviews, or changes that touch several layers.

Do not use this skill to impose a preferred framework layout. A repository's current conventions are evidence; a generic template is not.

## Non-negotiable principles

1. **Discover before prescribing.** Read manifests, configs, entry points, representative modules, tests, and documentation before deciding where code belongs.
2. **Prefer existing ownership.** Extend the module that already owns the behavior unless there is clear evidence that ownership is wrong.
3. **Minimize new concepts.** Do not create `utils`, `services`, `core`, `shared`, or abstraction layers merely because they are common names.
4. **Respect dependency direction.** High-level/domain logic should not become coupled to delivery/UI/infrastructure details without a deliberate boundary.
5. **Refactor from evidence.** Duplication, cyclic dependencies, change friction, test difficulty, or unclear ownership justify structural work; aesthetics alone usually do not.
6. **Preserve public contracts by default.** Break APIs, imports, routes, persistence formats, or configuration only when the task requires it and migration is planned.

## Workflow

### 1. Inventory the repository

Start with a compact structural scan:

```bash
python scripts/inventory_codebase.py <project-root> --json
```

Then inspect the files that establish conventions:

- package/project manifests and lockfiles;
- framework/build/test/lint/type configs;
- source roots and entry points;
- routing/controllers/handlers or equivalent delivery boundaries;
- domain/model/business logic;
- persistence/integration adapters;
- shared components/utilities;
- tests and fixtures;
- architecture docs, ADRs, contributor instructions, agent instructions.

The script is only a map. Read representative code before drawing architectural conclusions.

### 2. Build an ownership map

For every concept affected by the task, answer:

- Which module currently owns the data or behavior?
- Who calls it?
- What does it depend on?
- Where is it tested?
- Which public surface exposes it?
- Is there already an adjacent pattern for the requested change?

Read `references/folder-responsibilities.md` when the repository has ambiguous folder responsibilities. Use it as a reasoning framework, never as a prescribed folder tree.

### 3. Trace dependency direction

Trace the smallest relevant path from caller to owned behavior to external side effect. Watch for:

- domain logic imported from UI/view code;
- low-level modules importing high-level orchestration;
- circular imports;
- feature modules reaching into another feature's internals;
- shared modules becoming dumping grounds;
- data-access details leaking through several layers;
- business rules duplicated at multiple boundaries.

Read `references/anti-patterns.md` when one of these smells appears.

### 4. Choose the smallest coherent change

Prefer, in order:

1. extend an existing module/pattern;
2. extract a local helper with one owner;
3. introduce a reusable boundary only after multiple consumers or a stability/testing reason exists;
4. perform broad restructuring only when the user requested it or evidence shows the current structure blocks the task.

Do not create abstractions “for future use.”

### 5. Plan migrations explicitly

For structural changes, list:

- files/modules moved or introduced;
- import/public API changes;
- compatibility layer if needed;
- tests that prove preserved behavior;
- sequencing to keep the repository buildable;
- cleanup that happens only after consumers migrate.

Read `references/refactoring-playbook.md` for larger moves.

### 6. Validate

Use the repository's own commands. At minimum, when available:

- formatter/lint;
- typecheck or compiler;
- unit/integration tests touching changed boundaries;
- architecture/dependency checks already present;
- build/package checks for public export changes.

Search for stale imports and old names after moves. Never claim architectural safety from a passing build alone.

## Architecture review output

Separate the report into:

- **Observed structure** — facts from the repository;
- **Boundary risks** — concrete coupling/ownership issues with file evidence;
- **Recommended change** — smallest coherent action;
- **Migration impact** — public contracts, imports, data/config effects;
- **Validation** — checks actually performed;
- **Open uncertainty** — anything not proven from available files/tests.

Use `references/output-templates.md` when a formal architecture/refactor report is requested.

## Common failure modes

- Assuming a `src/`, `app/`, `features/`, monorepo, clean architecture, or hexagonal layout without evidence.
- Splitting files because they are long rather than because responsibilities differ.
- Moving code into “shared” while preserving hidden feature coupling.
- Creating a service/repository/interface trio for simple local logic with one consumer.
- Rewriting a stable area while implementing an unrelated feature.
- Treating folder names as architecture without tracing imports and runtime ownership.
- Ignoring generated code, package exports, tests, migrations, or build tooling during a move.

## Handoff

After ownership and boundaries are clear, hand implementation details to the most specific relevant skill. For frontend implementation use `senior-frontend-engineering`; for Next.js routing/rendering structure use `nextjs-architecture-pattern`; for container packaging use `container-compose-ghcr-deployment`.
