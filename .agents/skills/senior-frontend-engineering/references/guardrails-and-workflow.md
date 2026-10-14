# Guardrails for broad frontend changes

Before a cross-cutting refactor: map consumers; preserve public props/routes/contracts where possible; sequence changes so intermediate states build; add regression coverage first for risky behavior; change one ownership boundary at a time; remove compatibility code only after consumers migrate; run repository checks after each coherent step.

Do not combine formatting churn, dependency migration, folder reorganization, design-system rewrite, and feature behavior in one change unless the user explicitly wants a coordinated migration.
