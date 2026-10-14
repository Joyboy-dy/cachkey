# Reasoning about folder responsibilities

Do not treat these as folder names to create. Use them to infer ownership from any repository structure.

For a directory/module, record:

- **Purpose:** what kind of behavior/data it owns.
- **Allowed dependencies:** what it may import/call.
- **Consumers:** which layers/features use it.
- **Public surface:** exports/routes/contracts that outsiders rely on.
- **Generated vs authored:** whether tooling owns any contents.
- **Tests:** where behavior is verified.

A good folder boundary has a coherent reason to change. If two groups of files change for unrelated reasons, they may need different owners. If two folders always change together and expose each other's internals, the split may be artificial.

Common conceptual owners include delivery/UI, application orchestration, domain/business rules, data access, external integrations, configuration, shared primitives, and generated artifacts. Map these concepts onto the repository's existing names rather than renaming everything to match the concepts.
