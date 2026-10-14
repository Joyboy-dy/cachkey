# Architecture anti-patterns

Use these as investigation prompts, not automatic verdicts.

## Ambiguous shared/common/util folders

A folder becomes risky when unrelated features add code there with no clear owner. Diagnose by tracing consumers and change reasons. Prefer a specific owner or a small shared capability whose contract is stable.

## Cross-feature internal imports

One feature reaches into another feature's private implementation instead of a public boundary. This increases coupling and makes moves difficult. Expose the smallest stable contract or move genuinely shared behavior to an appropriate shared owner.

## Delivery layer owns business rules

Routes/controllers/views/CLI handlers contain persistence queries, provider calls, transformations, and business decisions in one unit. Extract only the behavior that deserves independent ownership/testing; do not create layers mechanically.

## Infrastructure leaks upward

Domain/use-case code depends directly on UI framework, transport request objects, database client details, or deployment concerns. Introduce a boundary when this coupling blocks reuse/testing or inverts intended dependency direction.

## Cycles

Circular imports often signal mixed ownership or a shared concept placed in one side of a relationship. Find the smallest concept causing the cycle and give it one direction/owner rather than hiding the cycle with dynamic loading.

## “One interface per class” ceremony

Interfaces/abstract classes with one implementation and no testing/substitution boundary can add navigation cost without benefit. Keep abstractions where volatility or multiple implementations justify them.

## Generated/vendor and product code mixed together

When tooling regenerates a folder, custom files in that folder can be overwritten or make ownership unclear. Keep generated/vendor-owned artifacts separable from application-owned wrappers/extensions according to the tool's documented workflow.
